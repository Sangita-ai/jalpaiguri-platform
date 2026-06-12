"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../utils/prisma");
const s3_1 = require("../utils/s3");
const upload_1 = require("../middleware/upload");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /api/tasks/mine — field worker's active assignments
router.get('/mine', async (req, res) => {
    try {
        const tasks = await prisma_1.prisma.assignment.findMany({
            where: { workerId: req.user.id, isActive: true },
            include: {
                complaint: {
                    include: {
                        ward: { select: { name: true, wardNumber: true } },
                        attachments: { take: 1 },
                    },
                },
            },
            orderBy: [
                { completedAt: 'asc' }, // incomplete first
                { assignedAt: 'desc' },
            ],
        });
        res.json(tasks);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// POST /api/tasks/:id/start — field worker starts task
router.post('/:id/start', async (req, res) => {
    try {
        const assignment = await prisma_1.prisma.assignment.findUnique({ where: { id: req.params.id } });
        if (!assignment)
            return (0, response_1.notFound)(res, 'Assignment not found');
        if (assignment.workerId !== req.user.id)
            return res.status(403).json({ error: 'Not your assignment' });
        const [updated] = await Promise.all([
            prisma_1.prisma.assignment.update({
                where: { id: req.params.id },
                data: { startedAt: new Date() },
            }),
            prisma_1.prisma.complaint.update({
                where: { id: assignment.complaintId },
                data: { status: 'IN_PROGRESS' },
            }),
        ]);
        res.json(updated);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// POST /api/tasks/:id/complete — submit completion with photos
router.post('/:id/complete', upload_1.multiUpload, async (req, res) => {
    try {
        const assignment = await prisma_1.prisma.assignment.findUnique({ where: { id: req.params.id } });
        if (!assignment)
            return (0, response_1.notFound)(res, 'Assignment not found');
        if (assignment.workerId !== req.user.id)
            return res.status(403).json({ error: 'Not your assignment' });
        const { notes } = req.body;
        let photoUrl;
        // Upload first photo as completion photo
        const files = req.files;
        if (files?.length) {
            const file = files[0];
            const key = `completions/${assignment.id}/${Date.now()}-${file.originalname}`;
            photoUrl = await (0, s3_1.uploadToS3)(key, file.buffer, file.mimetype);
            // Also attach remaining photos to complaint
            for (const f of files.slice(1)) {
                const k = `complaints/${assignment.complaintId}/${Date.now()}-${f.originalname}`;
                const u = await (0, s3_1.uploadToS3)(k, f.buffer, f.mimetype);
                await prisma_1.prisma.complaintAttachment.create({
                    data: { complaintId: assignment.complaintId, s3Key: k, s3Url: u, mimeType: f.mimetype, sizeBytes: f.size },
                });
            }
        }
        const [updatedAssignment] = await Promise.all([
            prisma_1.prisma.assignment.update({
                where: { id: req.params.id },
                data: {
                    completedAt: new Date(),
                    completionNotes: notes,
                    completionPhotoUrl: photoUrl,
                },
            }),
            prisma_1.prisma.complaint.update({
                where: { id: assignment.complaintId },
                data: { status: 'RESOLVED', resolvedAt: new Date() },
            }),
        ]);
        res.json(updatedAssignment);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
exports.default = router;
//# sourceMappingURL=tasks.js.map