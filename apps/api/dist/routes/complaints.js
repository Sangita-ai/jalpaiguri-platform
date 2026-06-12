"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const upload_1 = require("../middleware/upload");
const validate_1 = require("../middleware/validate");
const audit_1 = require("../middleware/audit");
const prisma_1 = require("../utils/prisma");
const s3_1 = require("../utils/s3");
const ai_service_1 = require("../services/ai.service");
const complaint_service_1 = require("../services/complaint.service");
const paginate_1 = require("../utils/paginate");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
const CreateSchema = zod_1.z.object({
    category: zod_1.z.enum(['GARBAGE', 'WATER_LEAKAGE', 'WATER_SUPPLY', 'DRAINAGE', 'ROAD_DAMAGE', 'STREETLIGHT_FAILURE', 'ILLEGAL_DUMPING', 'OTHER']),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
    locationLat: zod_1.z.coerce.number().optional(),
    locationLng: zod_1.z.coerce.number().optional(),
    address: zod_1.z.string().optional(),
    wardId: zod_1.z.string().uuid().optional(),
});
const StatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
    notes: zod_1.z.string().optional(),
});
const AssignSchema = zod_1.z.object({
    workerId: zod_1.z.string().uuid(),
    dueAt: zod_1.z.string().datetime().optional(),
});
// ── GET /api/complaints ───────────────────────────────────────
router.get('/', auth_1.authenticate, (0, rbac_1.requireMinRole)('DEPT_HEAD'), async (req, res) => {
    try {
        const { page, limit, skip } = (0, paginate_1.getPagination)(req);
        const { status, category, wardId, priority, search, from, to, sortBy = 'submittedAt', sortOrder = 'desc' } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (category)
            where.category = category;
        if (wardId)
            where.wardId = wardId;
        if (priority === 'high')
            where.priorityScore = { gte: 70 };
        if (from || to) {
            where.submittedAt = {};
            if (from)
                where.submittedAt.gte = new Date(from);
            if (to)
                where.submittedAt.lte = new Date(to);
        }
        if (search) {
            where.OR = [
                { description: { contains: search, mode: 'insensitive' } },
                { complaintNumber: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
            ];
        }
        const validSortFields = ['submittedAt', 'priorityScore', 'status', 'category'];
        const orderField = validSortFields.includes(sortBy) ? sortBy : 'submittedAt';
        const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';
        const [data, total] = await Promise.all([
            prisma_1.prisma.complaint.findMany({
                where,
                include: complaint_service_1.COMPLAINT_INCLUDE,
                orderBy: { [orderField]: orderDir },
                skip, take: limit,
            }),
            prisma_1.prisma.complaint.count({ where }),
        ]);
        res.json((0, paginate_1.paginatedResponse)(data, total, page, limit));
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// ── GET /api/complaints/mine ──────────────────────────────────
router.get('/mine', auth_1.authenticate, async (req, res) => {
    try {
        const { page, limit, skip } = (0, paginate_1.getPagination)(req);
        const [data, total] = await Promise.all([
            prisma_1.prisma.complaint.findMany({
                where: { reporterId: req.user.id },
                include: complaint_service_1.COMPLAINT_INCLUDE,
                orderBy: { submittedAt: 'desc' },
                skip, take: limit,
            }),
            prisma_1.prisma.complaint.count({ where: { reporterId: req.user.id } }),
        ]);
        res.json((0, paginate_1.paginatedResponse)(data, total, page, limit));
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// ── GET /api/complaints/track/:number — public ────────────────
router.get('/track/:number', auth_1.optionalAuth, async (req, res) => {
    try {
        const c = await prisma_1.prisma.complaint.findUnique({
            where: { complaintNumber: req.params.number },
            include: {
                ward: { select: { name: true, wardNumber: true } },
                assignments: {
                    where: { isActive: true },
                    select: { assignedAt: true, completedAt: true, completionNotes: true, completionPhotoUrl: true },
                    take: 1,
                },
                attachments: { select: { s3Url: true, capturedAt: true, mimeType: true } },
            },
        });
        if (!c)
            return (0, response_1.notFound)(res, 'Complaint not found');
        res.json({
            complaintNumber: c.complaintNumber,
            category: c.category,
            status: c.status,
            wardName: c.ward.name,
            submittedAt: c.submittedAt,
            acknowledgedAt: c.acknowledgedAt,
            resolvedAt: c.resolvedAt,
            address: c.address,
            assignment: c.assignments[0] ?? null,
            attachmentCount: c.attachments.length,
        });
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// ── GET /api/complaints/:id ───────────────────────────────────
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const c = await prisma_1.prisma.complaint.findUnique({
            where: { id: req.params.id },
            include: {
                ...complaint_service_1.COMPLAINT_INCLUDE,
                assignments: {
                    include: {
                        worker: { select: { name: true, phone: true, email: true } },
                        assignedBy: { select: { name: true, role: true } },
                    },
                    orderBy: { assignedAt: 'desc' },
                },
            },
        });
        if (!c)
            return (0, response_1.notFound)(res, 'Complaint not found');
        if (req.user.role === 'CITIZEN' && c.reporterId !== req.user.id) {
            return (0, response_1.forbidden)(res);
        }
        res.json(c);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// ── POST /api/complaints ──────────────────────────────────────
router.post('/', auth_1.authenticate, upload_1.multiUpload, async (req, res) => {
    try {
        // Validate body
        const parsed = CreateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
            });
        }
        const { category, description, locationLat, locationLng, address, wardId: bodyWardId } = parsed.data;
        // Resolve ward
        let wardId = bodyWardId;
        if (!wardId && locationLat && locationLng) {
            wardId = (await (0, complaint_service_1.resolveWardFromGPS)(locationLat, locationLng)) ?? undefined;
        }
        if (!wardId) {
            const first = await prisma_1.prisma.ward.findFirst({ orderBy: { wardNumber: 'asc' } });
            wardId = first.id;
        }
        // AI triage
        const ai = await (0, ai_service_1.aiTriageComplaint)(description, category);
        // Generate complaint number
        const complaintNumber = await (0, complaint_service_1.generateComplaintNumber)();
        // Create complaint
        const complaint = await prisma_1.prisma.complaint.create({
            data: {
                complaintNumber,
                reporterId: req.user.id,
                wardId,
                category,
                description,
                locationLat: locationLat ?? null,
                locationLng: locationLng ?? null,
                address: address ?? null,
                aiCategory: ai.category,
                aiConfidence: ai.confidence,
                aiNotes: ai.notes,
                priorityScore: ai.priorityScore,
                isDuplicate: ai.isDuplicate,
                duplicateOf: ai.duplicateOfId ?? undefined,
            },
            include: complaint_service_1.COMPLAINT_INCLUDE,
        });
        // Upload photos
        const files = req.files;
        if (files?.length) {
            await Promise.all(files.map(async (file) => {
                const key = `complaints/${complaint.id}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                const url = await (0, s3_1.uploadToS3)(key, file.buffer, file.mimetype);
                await prisma_1.prisma.complaintAttachment.create({
                    data: {
                        complaintId: complaint.id,
                        s3Key: key,
                        s3Url: url,
                        mimeType: file.mimetype,
                        sizeBytes: file.size,
                    },
                });
            }));
        }
        // Broadcast to WebSocket subscribers
        if (global.broadcastComplaintUpdate) {
            global.broadcastComplaintUpdate(complaint);
        }
        const full = await prisma_1.prisma.complaint.findUnique({
            where: { id: complaint.id }, include: complaint_service_1.COMPLAINT_INCLUDE,
        });
        (0, response_1.created)(res, full);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// ── PATCH /api/complaints/:id/status ─────────────────────────
router.patch('/:id/status', auth_1.authenticate, (0, rbac_1.requireMinRole)('FIELD_WORKER'), (0, validate_1.validate)(StatusSchema), (0, audit_1.auditLog)('UPDATE_STATUS', 'complaint'), async (req, res) => {
    try {
        const { status, notes } = req.body;
        const existing = await prisma_1.prisma.complaint.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return (0, response_1.notFound)(res, 'Complaint not found');
        const updateData = { status };
        if (status === 'RESOLVED')
            updateData.resolvedAt = new Date();
        if (status === 'CLOSED')
            updateData.closedAt = new Date();
        if (status === 'ASSIGNED')
            updateData.acknowledgedAt = new Date();
        const updated = await prisma_1.prisma.complaint.update({
            where: { id: req.params.id },
            data: updateData,
            include: complaint_service_1.COMPLAINT_INCLUDE,
        });
        if (['RESOLVED', 'CLOSED'].includes(status)) {
            await prisma_1.prisma.assignment.updateMany({
                where: { complaintId: req.params.id, isActive: true },
                data: { completedAt: new Date(), completionNotes: notes },
            });
        }
        if (global.broadcastComplaintUpdate) {
            global.broadcastComplaintUpdate(updated);
        }
        res.json(updated);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// ── POST /api/complaints/:id/assign ──────────────────────────
router.post('/:id/assign', auth_1.authenticate, (0, rbac_1.requireMinRole)('DEPT_HEAD'), (0, validate_1.validate)(AssignSchema), (0, audit_1.auditLog)('ASSIGN', 'complaint'), async (req, res) => {
    try {
        const { workerId, dueAt } = req.body;
        const [worker, complaint] = await Promise.all([
            prisma_1.prisma.user.findUnique({ where: { id: workerId, role: 'FIELD_WORKER' } }),
            prisma_1.prisma.complaint.findUnique({ where: { id: req.params.id } }),
        ]);
        if (!worker)
            return (0, response_1.notFound)(res, 'Worker not found');
        if (!complaint)
            return (0, response_1.notFound)(res, 'Complaint not found');
        // Deactivate prior assignment
        await prisma_1.prisma.assignment.updateMany({
            where: { complaintId: req.params.id, isActive: true },
            data: { isActive: false },
        });
        const assignment = await prisma_1.prisma.assignment.create({
            data: {
                complaintId: req.params.id,
                workerId,
                assignedById: req.user.id,
                dueAt: dueAt ? new Date(dueAt) : new Date(Date.now() + 48 * 3600000),
                isActive: true,
            },
            include: { worker: { select: { name: true, phone: true } } },
        });
        await prisma_1.prisma.complaint.update({
            where: { id: req.params.id },
            data: { status: 'ASSIGNED', acknowledgedAt: new Date() },
        });
        res.json(assignment);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
exports.default = router;
//# sourceMappingURL=complaints.js.map