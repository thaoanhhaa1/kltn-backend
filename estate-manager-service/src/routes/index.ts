import express from 'express';
import attribute from './attribute.route';
import authRoute from './auth.route';
import property from './property.route';
import propertyInteraction from './propertyInteraction.route';
import rentalRequest from './rentalRequest.route';
import userRoute from './user.route';

const router = express.Router();

router.use('/users', userRoute);
router.use('/auth', authRoute);
router.use('/attributes', attribute);
router.use('/properties', property);
router.use('/property-interactions', propertyInteraction);
router.use('/rental-requests', rentalRequest);

export default router;
