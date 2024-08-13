import express from 'express';
import attribute from './attribute.route';
import property from './property.route';
import propertyInteraction from './propertyInteraction.route';

const router = express.Router();

router.use('/attributes', attribute);
router.use('/properties', property);
router.use('/property_interactions', propertyInteraction);

export default router;
