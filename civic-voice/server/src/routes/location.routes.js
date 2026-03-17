import { Router } from "express";
import { updatePrimaryLocation } from "../controllers/location.controller.js";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.put("/primary", requireAuth, asyncHandler(updatePrimaryLocation));

export default router;
