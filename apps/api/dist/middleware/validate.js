"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
function validate(schema, target = 'body') {
    return (req, res, next) => {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: result.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
            });
        }
        req[target] = result.data;
        next();
    };
}
exports.validate = validate;
//# sourceMappingURL=validate.js.map