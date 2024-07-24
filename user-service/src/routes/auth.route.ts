import express from 'express';
import { login, otpRegister, register } from '../controllers/auth.controller';

const router = express.Router();

router.post('/login', login);
router.post('/register/otp', otpRegister);
router.post('/register', register);

export default router;
