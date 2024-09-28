import express from 'express';
import { getChatsByUserId, getConversationsByUserId } from '../controllers/chat.controller';
import authMiddleware from '../middlewares/auth.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';

const router = express.Router();

// FIXME: Comment this line to enable authentication
// router.post('/', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), createChat);

router.get('/', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), getChatsByUserId);
router.get('/conversation', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), getConversationsByUserId);

export default router;
