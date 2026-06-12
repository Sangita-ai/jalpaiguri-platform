"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverError = exports.forbidden = exports.badRequest = exports.notFound = exports.created = exports.ok = void 0;
function ok(res, data, status = 200) {
    return res.status(status).json(data);
}
exports.ok = ok;
function created(res, data) {
    return res.status(201).json(data);
}
exports.created = created;
function notFound(res, msg = 'Not found') {
    return res.status(404).json({ error: msg });
}
exports.notFound = notFound;
function badRequest(res, msg) {
    return res.status(400).json({ error: msg });
}
exports.badRequest = badRequest;
function forbidden(res, msg = 'Forbidden') {
    return res.status(403).json({ error: msg });
}
exports.forbidden = forbidden;
function serverError(res, err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    console.error('[API Error]', err);
    return res.status(500).json({ error: msg });
}
exports.serverError = serverError;
//# sourceMappingURL=response.js.map