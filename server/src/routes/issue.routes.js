import { Router } from "express";
import {
  addComment,
  createIssue,
  deleteIssue,
  getIssuesByLocation,
  listIssues,
  reportSpam,
  trendingIssues,
  upvoteIssue,
} from "../controllers/issue.controller.js";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/by-location", requireAuth, asyncHandler(getIssuesByLocation));
router.get("/", requireAuth, asyncHandler(listIssues));
router.get("/trending", requireAuth, asyncHandler(trendingIssues));
router.post("/", requireAuth, asyncHandler(createIssue));
router.post("/:id/upvote", requireAuth, asyncHandler(upvoteIssue));
router.post("/:id/comments", requireAuth, asyncHandler(addComment));
router.post("/:id/report", requireAuth, asyncHandler(reportSpam));
router.delete("/:id", requireAuth, asyncHandler(deleteIssue));

export default router;
