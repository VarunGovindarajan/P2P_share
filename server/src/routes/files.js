import express from "express";
import {
  uploadFile,
  getMyFiles,
  getSharedFiles,
  downloadFile,
  verifyFileIntegrity,
  grantAccess,
  revokeAccess,
  deleteFile,
} from "../controllers/fileController.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/upload", protect, upload.single("file"), uploadFile);
router.get("/", protect, getMyFiles);
router.get("/shared", protect, getSharedFiles);
router.get("/:id/download", protect, downloadFile);
router.get("/:id/verify", protect, verifyFileIntegrity);
router.post("/:id/grant", protect, grantAccess);
router.post("/:id/revoke", protect, revokeAccess);
router.delete("/:id", protect, deleteFile);

export default router;