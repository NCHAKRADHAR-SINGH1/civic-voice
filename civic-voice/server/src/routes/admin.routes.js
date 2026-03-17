import { Router } from "express";
import { listModerationQueue, updateIssueStatus, resolveIssue } from "../controllers/admin.controller.js";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/posts", requireAuth, requireAdmin, asyncHandler(listModerationQueue));
router.patch("/posts/:id/status", requireAuth, requireAdmin, asyncHandler(updateIssueStatus));
router.post("/posts/:id/resolve", requireAuth, requireAdmin, asyncHandler(resolveIssue));

export default router;
