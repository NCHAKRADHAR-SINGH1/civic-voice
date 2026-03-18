import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
	getSession,
	loginWithPassword,
	logout,
	registerWithPassword,
	resetPasswordWithOtp,
	setUserRole,
	verifyOtp,
} from "../controllers/auth.controller.js";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

const verifyOtpLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	message: { message: "Too many OTP attempts, please try again later." },
});

const passwordAuthLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 40,
	standardHeaders: true,
	legacyHeaders: false,
	message: { message: "Too many authentication attempts, please try again later." },
});

router.post("/register-password", passwordAuthLimiter, asyncHandler(registerWithPassword));
router.post("/login-password", passwordAuthLimiter, asyncHandler(loginWithPassword));
router.post("/reset-password-otp", verifyOtpLimiter, asyncHandler(resetPasswordWithOtp));
router.post("/verify-otp", verifyOtpLimiter, asyncHandler(verifyOtp));
router.get("/session", requireAuth, asyncHandler(getSession));
router.post("/logout", requireAuth, asyncHandler(logout));
router.put("/role", requireAuth, asyncHandler(setUserRole));

export default router;
