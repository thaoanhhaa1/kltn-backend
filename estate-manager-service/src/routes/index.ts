import express from 'express';
import attribute from './attribute.route';
import authRoute from './auth.route';
import conversationRoute from './conversation.route';
import dashboardRoute from './dashboard.route';
import notificationRoute from './notification.route';
import property from './property.route';
import propertyInteraction from './propertyInteraction.route';
import propertyTypeRoute from './propertyType.route';
import rejectReasonRoute from './rejectReason.route';
import rentalRequest from './rentalRequest.route';
import reviewRoute from './review.route';
import userRoute from './user.route';

const router = express.Router();

router.use('/users', userRoute);
router.use('/auth', authRoute);
router.use('/property-types', propertyTypeRoute);
router.use('/attributes', attribute);
router.use('/properties', property);
router.use('/property-interactions', propertyInteraction);
router.use('/rental-requests', rentalRequest);
router.use('/notifications', notificationRoute);
router.use('/conversations', conversationRoute);
router.use('/reviews', reviewRoute);
router.use('/dashboard', dashboardRoute);
router.use('/reject-reasons', rejectReasonRoute);

export default router;
