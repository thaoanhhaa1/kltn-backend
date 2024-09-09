import express from 'express';
import userRoute from './user.route';
import authRoute from './auth.route';
import attribute from './attribute.route';
import property from './property.route';
import propertyInteraction from './propertyInteraction.route';

const router = express.Router();

router.use('/users', userRoute);
router.use('/auth', authRoute);
router.use('/attributes', attribute);
router.use('/properties', property);
router.use('/property_interactions', propertyInteraction);

export default router;
