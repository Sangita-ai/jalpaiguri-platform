import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../utils/prisma';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORIES = [
  'GARBAGE','WATER_LEAKAGE','WATER_SUPPLY','DRAINAGE',
  'ROAD_DAMAGE','STREETLIGHT_FAILURE','ILLEGAL_DUMPING','OTHER'
] as const;

export interface TriageResult {
  category:      string;
  confidence:    number;
  priorityScore: number;
  isDuplicate:   boolean;
  duplicateOfId: string | null;
  notes:         string;
  suggestedDept: string;
}

export async function aiTriageComplaint(
  description: string,
  providedCategory?: string
): Promise<TriageResult> {
  // Fallback if no API key configured
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('your-key')) {
    return mockTriage(description, providedCategory);
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: `You are a municipal complaint triage AI for Jalpaiguri Municipality, West Bengal, India.
Analyze citizen complaints and return a JSON object with these exact fields:
- category: one of ${CATEGORIES.join(', ')}
- confidence: float 0–1 (how confident in category)
- priorityScore: integer 0–100 (100=most urgent: water cut, flooding, road collapse; 30=low: minor aesthetic)
- isDuplicate: boolean (true if complaint sounds like a common repeated issue)
- notes: string (2-sentence analysis of urgency and recommended action)
- suggestedDept: one of "Sanitation", "Water Supply", "Drainage", "Public Works", "Electrical", "General"
Return ONLY valid JSON. No markdown, no explanation.`,
      messages: [{ role: 'user', content: `Triage this complaint: "${description}"${providedCategory ? `. User indicated category: ${providedCategory}` : ''}` }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(text.trim());

    // Validate fields
    return {
      category:      CATEGORIES.includes(parsed.category) ? parsed.category : (providedCategory ?? 'OTHER'),
      confidence:    Math.min(1, Math.max(0, parsed.confidence ?? 0.8)),
      priorityScore: Math.min(100, Math.max(0, Math.round(parsed.priorityScore ?? 50))),
      isDuplicate:   Boolean(parsed.isDuplicate),
      duplicateOfId: null,
      notes:         String(parsed.notes ?? ''),
      suggestedDept: parsed.suggestedDept ?? 'General',
    };
  } catch (err) {
    console.warn('[AI Triage] Falling back to rule-based:', err);
    return mockTriage(description, providedCategory);
  }
}

export async function checkDuplicate(
  description: string,
  locationLat?: number,
  locationLng?: number,
  withinHours = 48
): Promise<{ isDuplicate: boolean; duplicateOfId: string | null; similarity: number }> {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('your-key')) {
    return { isDuplicate: false, duplicateOfId: null, similarity: 0 };
  }

  try {
    // Get recent complaints in same area
    const since = new Date(Date.now() - withinHours * 3600 * 1000);
    const recent = await prisma.complaint.findMany({
      where: {
        submitted_at: { gte: since },
        ...(locationLat && locationLng ? {
          locationLat: { gte: locationLat - 0.005, lte: locationLat + 0.005 },
          locationLng: { gte: locationLng - 0.005, lte: locationLng + 0.005 },
        } : {}),
      },
      select: { id: true, description: true, category: true },
      take: 10,
    });

    if (!recent.length) return { isDuplicate: false, duplicateOfId: null, similarity: 0 };

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: `You are a duplicate complaint detector for a municipal system. Given a new complaint and a list of recent complaints, determine if the new one is a duplicate. Return ONLY JSON: { "isDuplicate": boolean, "duplicateId": "uuid or null", "similarity": 0.0-1.0 }`,
      messages: [{
        role: 'user',
        content: `New complaint: "${description}"\n\nRecent complaints:\n${recent.map((r, i) => `${i + 1}. [${r.id}] ${r.description}`).join('\n')}`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const parsed = JSON.parse(text.trim());
    return {
      isDuplicate:   Boolean(parsed.isDuplicate),
      duplicateOfId: parsed.duplicateId ?? null,
      similarity:    Math.min(1, Math.max(0, parsed.similarity ?? 0)),
    };
  } catch {
    return { isDuplicate: false, duplicateOfId: null, similarity: 0 };
  }
}

// Rule-based fallback when no API key
function mockTriage(description: string, providedCategory?: string): TriageResult {
  const lower = description.toLowerCase();

  const rules: Array<{ keywords: string[]; category: string; priority: number; dept: string }> = [
    { keywords: ['water','pipe','leak','burst','leakage'],      category: 'WATER_LEAKAGE',       priority: 80, dept: 'Water Supply' },
    { keywords: ['garbage','waste','dustbin','trash','dump'],   category: 'GARBAGE',              priority: 55, dept: 'Sanitation' },
    { keywords: ['drain','drainage','flood','waterlog','sewer'],category: 'DRAINAGE',             priority: 70, dept: 'Drainage' },
    { keywords: ['road','pothole','cave','accident','surface'], category: 'ROAD_DAMAGE',          priority: 65, dept: 'Public Works' },
    { keywords: ['light','streetlight','lamp','dark'],          category: 'STREETLIGHT_FAILURE',  priority: 45, dept: 'Electrical' },
    { keywords: ['supply','tap','no water','shortage'],         category: 'WATER_SUPPLY',         priority: 75, dept: 'Water Supply' },
    { keywords: ['illegal','encroach','unauthorised','dump'],   category: 'ILLEGAL_DUMPING',      priority: 50, dept: 'General' },
  ];

  let category      = providedCategory ?? 'OTHER';
  let priorityScore = 40;
  let suggestedDept = 'General';

  for (const rule of rules) {
    if (rule.keywords.some(k => lower.includes(k))) {
      if (!providedCategory) category = rule.category;
      priorityScore = rule.priority;
      suggestedDept = rule.dept;
      break;
    }
  }

  // Urgency boosters
  if (['urgent','emergency','accident','flooding','burst'].some(k => lower.includes(k))) {
    priorityScore = Math.min(100, priorityScore + 15);
  }

  return {
    category,
    confidence:    0.75,
    priorityScore,
    isDuplicate:   false,
    duplicateOfId: null,
    notes:         `Rule-based triage. Category: ${category}. Assigned to ${suggestedDept} department.`,
    suggestedDept,
  };
}
