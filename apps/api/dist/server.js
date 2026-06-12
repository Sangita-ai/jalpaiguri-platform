"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const express_rate_limit_1 = require("express-rate-limit");
const auth_1 = __importDefault(require("./routes/auth"));
const complaints_1 = __importDefault(require("./routes/complaints"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const gis_1 = __importDefault(require("./routes/gis"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const trees_1 = __importDefault(require("./routes/trees"));
const water_1 = __importDefault(require("./routes/water"));
const drains_1 = __importDefault(require("./routes/drains"));
const ai_1 = __importDefault(require("./routes/ai"));
const users_1 = __importDefault(require("./routes/users"));
const error_1 = require("./middleware/error");
const sensor_broadcast_1 = require("./websocket/sensor.broadcast");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});
// ── Global middleware ──────────────────────────────────────────
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Rate limiting — 500 req / 15 min per IP
app.use('/api', (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
}));
// Stricter limit on auth endpoints
app.use('/api/auth/login', (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts. Try again in 15 minutes.' },
}));
// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', auth_1.default);
app.use('/api/complaints', complaints_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/gis', gis_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/trees', trees_1.default);
app.use('/api/water', water_1.default);
app.use('/api/drains', drains_1.default);
app.use('/api/ai', ai_1.default);
app.use('/api/users', users_1.default);
// Health check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'jalpaiguri-platform-api',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
    });
});
// 404
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handler (must be last)
app.use(error_1.errorHandler);
// ── WebSocket ─────────────────────────────────────────────────
(0, sensor_broadcast_1.initSensorBroadcast)(exports.io);
// ── Start ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000');
httpServer.listen(PORT, () => {
    console.log(`\n🚀  Jalpaiguri Platform API`);
    console.log(`    Port:    ${PORT}`);
    console.log(`    Env:     ${process.env.NODE_ENV}`);
    console.log(`    DB:      ${process.env.DATABASE_URL?.split('@')[1] ?? 'localhost'}`);
    console.log(`    WS:      enabled (30s sensor broadcast)\n`);
});
exports.default = app;
//# sourceMappingURL=server.js.map