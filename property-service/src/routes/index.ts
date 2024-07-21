import express from 'express';
import attribute from './attribute.route';

const router = express.Router();

router.use('/attributes', attribute);

export default router;
