import express from 'express';
import attribute from './attribute.route';
import property from './property.route';

const router = express.Router();

router.use('/attributes', attribute);
router.use('/properties', property);

export default router;
