import { Router } from "express";
import { register, login, getMe, logout } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { registerRules, loginRules, validate } from "../middleware/validate.js";
const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.post("/register", registerRules, validate, register);
router.post("/login",    loginRules,    validate, login);

// ── Protected routes ──────────────────────────────────────────────────────────
router.get("/me",     protect, getMe);
router.post("/logout", protect, logout);

export default router;
