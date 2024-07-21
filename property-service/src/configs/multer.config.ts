import express from 'express';
import multer from 'multer';

const fileFilter = (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');

    cb(null, true);
};

const storage = multer.memoryStorage();
const upload = multer({ storage, fileFilter });

export default upload;
