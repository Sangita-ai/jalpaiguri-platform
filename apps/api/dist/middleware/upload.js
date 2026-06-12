"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multiUpload = exports.singleUpload = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
exports.uploadMiddleware = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: MAX_SIZE, files: 5 },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`File type ${file.mimetype} not allowed. Use JPEG, PNG, or WebP.`));
        }
    },
});
exports.singleUpload = exports.uploadMiddleware.single('photo');
exports.multiUpload = exports.uploadMiddleware.array('photos', 5);
//# sourceMappingURL=upload.js.map