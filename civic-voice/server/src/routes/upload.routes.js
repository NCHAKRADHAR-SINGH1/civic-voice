import { Router } from "express";
import multer from "multer";
import { uploadImage } from "../controllers/upload.controller.js";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (!allowedMimeTypes.has(file.mimetype)) {
			cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "image"));
			return;
		}

		cb(null, true);
	},
});

router.post("/image", requireAuth, upload.single("image"), asyncHandler(uploadImage));

export default router;
