import { Router } from "express";
import multer from "multer";
import { protect, restrictTo } from "../middleware/auth.js";
import { bulkScreen } from "../controllers/bulkScreenController.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
import {
  getAllJobs, getMyJobs, createJob, deleteJob,
  applyToJob, getAppliedJobs, adminGetAllJobs, toggleJobStatus,
} from "../controllers/jobController.js";
import { rankCandidates, startMockInterview, evaluateMockInterview, reviewProfile, generateInterviewQuestions, evaluateInterview } from "../controllers/aiController.js";
import { updateProfile, getProfile, getOnboarding, getHROnboarding, submitOnboardingDoc, deleteOnboardingDoc } from "../controllers/candidateController.js";
import { scheduleInterview, getHRInterviews, getCandidateInterviews, updateInterviewStatus, submitAnswers } from "../controllers/interviewController.js";
import { getAllUsers, toggleUserStatus, resetUserPassword, getAnalytics, getWorkforceAnalytics, getAIInsights } from "../controllers/adminController.js";

const router = Router();

// ── Jobs ──────────────────────────────────────────────────────────────────────
router.get("/jobs",           protect, getAllJobs);
router.get("/jobs/my",        protect, restrictTo("hr"), getMyJobs);
router.get("/jobs/applied",   protect, restrictTo("candidate"), getAppliedJobs);
router.post("/jobs",          protect, restrictTo("hr"), createJob);
router.delete("/jobs/:id",    protect, restrictTo("hr"), deleteJob);
router.post("/jobs/:id/apply",protect, restrictTo("candidate"), applyToJob);

// ── Candidate ─────────────────────────────────────────────────────────────────
router.get("/candidate/profile",    protect, restrictTo("candidate"), getProfile);
router.put("/candidate/profile",    protect, restrictTo("candidate"), updateProfile);
router.get("/candidate/onboarding",              protect, restrictTo("candidate"), getOnboarding);
router.post("/candidate/onboarding/docs",        protect, restrictTo("candidate"), submitOnboardingDoc);
router.delete("/candidate/onboarding/docs/:docId", protect, restrictTo("candidate"), deleteOnboardingDoc);
router.get("/hr/onboarding",                     protect, restrictTo("hr"),        getHROnboarding);

// ── Interviews ────────────────────────────────────────────────────────────────
router.post("/interviews",                protect, restrictTo("hr"),        scheduleInterview);
router.get("/interviews/hr",             protect, restrictTo("hr"),        getHRInterviews);
router.get("/interviews/candidate",      protect, restrictTo("candidate"), getCandidateInterviews);
router.patch("/interviews/:id/status",   protect, restrictTo("hr"),        updateInterviewStatus);
router.patch("/interviews/:id/answers",  protect, restrictTo("candidate"), submitAnswers);

// ── AI / Gemini ───────────────────────────────────────────────────────────────
router.post("/ai/rank-candidates/:jobId",    protect, restrictTo("hr"),        rankCandidates);
router.post("/ai/mock-interview/start",     protect, restrictTo("candidate"), startMockInterview);
router.post("/ai/mock-interview/evaluate",  protect, restrictTo("candidate"), evaluateMockInterview);
router.post("/ai/profile-review",           protect, restrictTo("candidate"), reviewProfile);
router.post("/ai/interview-questions/:id",  protect, restrictTo("candidate"), generateInterviewQuestions);
router.post("/ai/evaluate-interview/:id",   protect, restrictTo("hr"),        evaluateInterview);

// ── Bulk Resume Screening ─────────────────────────────────────────────────────
router.post("/hr/bulk-screen", protect, restrictTo("hr"), upload.single("zipFile"), bulkScreen);


// ── Admin ─────────────────────────────────────────────────────────────────────
router.get("/admin/users",            protect, restrictTo("admin"), getAllUsers);
router.patch("/admin/users/:id/toggle",protect, restrictTo("admin"), toggleUserStatus);
router.patch("/admin/users/:id/reset-password", protect, restrictTo("admin"), resetUserPassword);
router.get("/admin/analytics",        protect, restrictTo("admin"), getAnalytics);
router.get("/admin/jobs",             protect, restrictTo("admin"), adminGetAllJobs);
router.patch("/admin/jobs/:id/toggle",  protect, restrictTo("admin"), toggleJobStatus);
router.get("/admin/workforce",          protect, restrictTo("admin"), getWorkforceAnalytics);
router.post("/admin/ai-insights",       protect, restrictTo("admin"), getAIInsights);

export default router;