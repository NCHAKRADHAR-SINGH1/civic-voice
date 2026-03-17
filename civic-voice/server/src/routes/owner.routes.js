import { Router } from "express";
import { listAdmins, listAuditLogs, updateAdminAccess } from "../controllers/owner.controller.js";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { requireAuth, requireOwner } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/audit-logs", requireAuth, requireOwner, asyncHandler(listAuditLogs));
router.get("/admins", requireAuth, requireOwner, asyncHandler(listAdmins));
router.patch("/admins/access", requireAuth, requireOwner, asyncHandler(updateAdminAccess));

export default router;