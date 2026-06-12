export interface TriageResult {
    category: string;
    confidence: number;
    priorityScore: number;
    isDuplicate: boolean;
    duplicateOfId: string | null;
    notes: string;
    suggestedDept: string;
}
export declare function aiTriageComplaint(description: string, providedCategory?: string): Promise<TriageResult>;
export declare function checkDuplicate(description: string, locationLat?: number, locationLng?: number, withinHours?: number): Promise<{
    isDuplicate: boolean;
    duplicateOfId: string | null;
    similarity: number;
}>;
//# sourceMappingURL=ai.service.d.ts.map