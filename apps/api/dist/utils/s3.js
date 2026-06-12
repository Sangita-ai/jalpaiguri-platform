"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresignedUrl = exports.deleteFromS3 = exports.uploadToS3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3 = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin',
    },
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}),
});
const BUCKET = process.env.S3_BUCKET || 'jalpaiguri-platform';
async function uploadToS3(key, body, contentType) {
    await s3.send(new client_s3_1.PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
    const endpoint = process.env.S3_ENDPOINT || `https://s3.${process.env.AWS_REGION}.amazonaws.com`;
    return `${endpoint}/${BUCKET}/${key}`;
}
exports.uploadToS3 = uploadToS3;
async function deleteFromS3(key) {
    await s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
exports.deleteFromS3 = deleteFromS3;
async function getPresignedUrl(key, expiresIn = 3600) {
    const cmd = new client_s3_1.GetObjectCommand({ Bucket: BUCKET, Key: key });
    return (0, s3_request_presigner_1.getSignedUrl)(s3, cmd, { expiresIn });
}
exports.getPresignedUrl = getPresignedUrl;
//# sourceMappingURL=s3.js.map