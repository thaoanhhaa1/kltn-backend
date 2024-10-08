import express from 'express';
import { getConversationsByUserId } from '../controllers/conversation.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = express.Router();

router.get('/', authMiddleware, getConversationsByUserId);

export default router;
