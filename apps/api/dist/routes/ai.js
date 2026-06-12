"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const ai_service_1 = require("../services/ai.service");
const validate_1 = require("../middleware/validate");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const TriageSchema = zod_1.z.object({
    description: zod_1.z.string().min(10),
    category: zod_1.z.string().optional(),
});
const DupSchema = zod_1.z.object({
    description: zod_1.z.string().min(10),
    locationLat: zod_1.z.number().optional(),
    locationLng: zod_1.z.number().optional(),
});
// POST /api/ai/triage
router.post('/triage', (0, validate_1.validate)(TriageSchema), async (req, res) => {
    try {
        const result = await (0, ai_service_1.aiTriageComplaint)(req.body.description, req.body.category);
        res.json(result);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
// POST /api/ai/duplicate-check
router.post('/duplicate-check', (0, validate_1.validate)(DupSchema), async (req, res) => {
    try {
        const { description, locationLat, locationLng } = req.body;
        const result = await (0, ai_service_1.checkDuplicate)(description, locationLat, locationLng);
        res.json(result);
    }
    catch (e) {
        (0, response_1.serverError)(res, e);
    }
});
exports.default = router;
//# sourceMappingURL=ai.js.map