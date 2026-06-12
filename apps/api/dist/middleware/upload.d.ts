/// <reference types="qs" />
/// <reference types="express" />
import multer from 'multer';
export declare const uploadMiddleware: multer.Multer;
export declare const singleUpload: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const multiUpload: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
//# sourceMappingURL=upload.d.ts.map