/// <reference types="node" />
export declare function uploadToS3(key: string, body: Buffer, contentType: string): Promise<string>;
export declare function deleteFromS3(key: string): Promise<void>;
export declare function getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
//# sourceMappingURL=s3.d.ts.map