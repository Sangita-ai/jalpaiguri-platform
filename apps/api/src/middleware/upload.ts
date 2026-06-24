// import multer from 'multer';

// const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
// const MAX_SIZE      = 10 * 1024 * 1024; // 10 MB

// export const uploadMiddleware = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: MAX_SIZE, files: 5 },
//   fileFilter: (_req, file, cb) => {
//     if (ALLOWED_TYPES.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error(`File type ${file.mimetype} not allowed. Use JPEG, PNG, or WebP.`));
//     }
//   },
// });

// export const singleUpload = uploadMiddleware.single('photo');
// export const multiUpload  = uploadMiddleware.array('photos', 5);

import multer from 'multer';

const storage = multer.memoryStorage();

export const multiUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG and WEBP files are allowed'));
    }
  },
}).array('photos', 5);