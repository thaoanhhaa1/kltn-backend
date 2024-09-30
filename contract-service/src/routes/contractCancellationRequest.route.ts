import express from 'express';
import { createCancellationRequest } from '../controllers/contractCancellationRequest.controller';
import authMiddleware from '../middlewares/auth.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';

const router = express.Router();

router.post('/', authMiddleware, hasAnyRoleMiddleware(['renter', 'owner']), createCancellationRequest);

export default router;
