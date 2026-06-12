"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const prisma_1 = require("../utils/prisma");
const paginate_1 = require("../utils/paginate");
const response_1 = require("../utils/response");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const CreateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    name: zod_1.z.string().min(2),
    phone: zod_1.z.string().optional(),
    role: zod_1.z.enum(['CITIZEN', 'FIELD_WORKER', 'DEPT_HEAD', 'MUNICIPAL_OFFICER', 'CHAIRMAN', 'SUPER_ADMIN']),
    wardNumber: zod_1.z.number().int().min(1).max(20).optional(),
    password: zod_1.z.string().min(8).default('Demo@1234'),
});
// GET /api/users
router.get('/', (0, rbac_1.requireMinRole)('DEPT_HEAD'), async (req, res) => {
    try {
        const { page, limit, skip } = (0, paginate_1.getPagination)(req);
        const { role, search, wardId } = req.query;
        const where = {};
        if (role)
            where.role = role;
        if (wardId)
            where.wardId = wardId;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [data, total] = await Promise.all([
            prisma_1.prisma.user.findMany({
                where,
                select: {
                    id: true, email: true, name: true, phone: true,
                    role: true, isActive: true, createdAt: true, lastLoginAt: true,
                    ward: { select: { name: true, wardNumber: true } },
                    _count: { select: { assignedTasks: true, reportedComplaints: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip, take: limit,
            }),
            prisma_1.prisma.user.count({ where }),
        ]);
        res.json((0, paginate_1.paginatedResponse)(data, total, page, limit));
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// GET /api/users/:id
router.get('/:id', (0, rbac_1.requireMinRole)('DEPT_HEAD'), async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true, email: true, name: true, phone: true, role: true,
                isActive: true, createdAt: true, lastLoginAt: true, avatarUrl: true,
                ward: { select: { name: true, wardNumber: true } },
                _count: { select: { assignedTasks: true, reportedComplaints: true } },
            },
        });
        if (!user)
            return (0, response_1.notFound)(res, 'User not found');
        res.json(user);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// POST /api/users
router.post('/', (0, rbac_1.requireMinRole)('MUNICIPAL_OFFICER'), (0, validate_1.validate)(CreateUserSchema), async (req, res) => {
    try {
        const { email, name, phone, role, wardNumber, password } = req.body;
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing)
            return (0, response_1.badRequest)(res, 'Email already registered');
        let wardId;
        if (wardNumber) {
            const ward = await prisma_1.prisma.ward.findUnique({ where: { wardNumber } });
            if (!ward)
                return (0, response_1.badRequest)(res, `Ward ${wardNumber} not found`);
            wardId = ward.id;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: { email, name, phone, role, wardId, passwordHash },
            select: { id: true, email: true, name: true, role: true, wardId: true },
        });
        (0, response_1.created)(res, user);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// PATCH /api/users/:id
router.patch('/:id', (0, rbac_1.requireMinRole)('MUNICIPAL_OFFICER'), async (req, res) => {
    try {
        const { name, phone, role, wardNumber, isActive, password } = req.body;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (phone !== undefined)
            updateData.phone = phone;
        if (role !== undefined)
            updateData.role = role;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (password)
            updateData.passwordHash = await bcryptjs_1.default.hash(password, 10);
        if (wardNumber) {
            const ward = await prisma_1.prisma.ward.findUnique({ where: { wardNumber: parseInt(wardNumber) } });
            if (ward)
                updateData.wardId = ward.id;
        }
        const user = await prisma_1.prisma.user.update({
            where: { id: req.params.id },
            data: updateData,
            select: { id: true, email: true, name: true, role: true, isActive: true },
        });
        res.json(user);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map