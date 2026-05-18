import File from "../models/File.js";
import Permission from "../models/Permission.js";
import User from "../models/User.js";
import crypto from "crypto";
import { uploadToIPFS, getFromIPFS } from "../services/ipfsService.js";
import { addBlock, verifyFile } from "../services/blockchainService.js";
import {
  generateKey,
  encryptFile,
  decryptFile,
  encryptKey,
  decryptKey,
} from "../services/encryptionService.js";
import fs from "fs";
import { notifyUser, broadcast } from "../socket/socketServer.js";

// POST /api/files/upload
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });

    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // Encrypt file
    const aesKey = generateKey();
    const encryptedBuffer = encryptFile(fileBuffer, aesKey);
    const encryptionKeyEnc = encryptKey(aesKey);

    // Upload encrypted file to IPFS
const ipfsCid = await uploadToIPFS(encryptedBuffer, req.file.originalname);
 
    fs.unlinkSync(req.file.path);

    const file = await File.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      ownerId: req.user.userId,
      fileHash,
      ipfsCid,
      encryptionKeyEnc,
    });

    await addBlock(file._id.toString(), fileHash);
    // Notify all users about new upload
broadcast("file-uploaded", {
  username: req.user.username,
  filename: file.originalName,
});
    res.status(201).json({
      message: "File uploaded and encrypted successfully",
      file: {
        id: file._id,
        originalName: file.originalName,
        size: file.size,
        mimetype: file.mimetype,
        fileHash: file.fileHash,
        ipfsCid: file.ipfsCid,
        createdAt: file.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};

// GET /api/files
export const getMyFiles = async (req, res) => {
  try {
    const files = await File.find({ ownerId: req.user.userId }).sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/files/shared
export const getSharedFiles = async (req, res) => {
  try {
    const permissions = await Permission.find({ grantedTo: req.user.userId }).populate("fileId");
    const files = permissions.map((p) => p.fileId).filter(Boolean);
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/files/:id/download
export const downloadFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });

    const isOwner = file.ownerId.toString() === req.user.userId;
    const hasPermission = await Permission.findOne({
      fileId: file._id,
      grantedTo: req.user.userId,
    });

    if (!isOwner && !hasPermission)
      return res.status(403).json({ message: "Access denied" });

    const encryptedBuffer = await getFromIPFS(file.ipfsCid);
    const aesKey = decryptKey(file.encryptionKeyEnc);
    const fileBuffer = decryptFile(encryptedBuffer, aesKey);

    res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
    res.setHeader("Content-Type", file.mimetype);
    res.send(fileBuffer);
  } catch (err) {
    res.status(500).json({ message: "Download failed", error: err.message });
  }
};

// GET /api/files/:id/verify
export const verifyFileIntegrity = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });

    const isOwner = file.ownerId.toString() === req.user.userId;
    const hasPermission = await Permission.findOne({
      fileId: file._id,
      grantedTo: req.user.userId,
    });

    if (!isOwner && !hasPermission)
      return res.status(403).json({ message: "Access denied" });

    const encryptedBuffer = await getFromIPFS(file.ipfsCid);
    const aesKey = decryptKey(file.encryptionKeyEnc);
    const fileBuffer = decryptFile(encryptedBuffer, aesKey);
    const currentHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const result = await verifyFile(file._id.toString(), currentHash);
    res.json({ filename: file.originalName, ...result });
  } catch (err) {
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
};

// POST /api/files/:id/grant
export const grantAccess = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: "Username required" });

    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.ownerId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Only owner can grant access" });

    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (targetUser._id.toString() === req.user.userId)
      return res.status(400).json({ message: "Cannot grant access to yourself" });

    await Permission.create({
      fileId: file._id,
      ownerId: req.user.userId,
      grantedTo: targetUser._id,
    });
    // Notify the user who was granted access
notifyUser(targetUser._id.toString(), "access-granted", {
  filename: file.originalName,
  from: req.user.username,
});

    res.json({ message: `Access granted to ${username}` });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "Access already granted" });
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/files/:id/revoke
export const revokeAccess = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: "Username required" });

    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.ownerId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Only owner can revoke access" });

    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    await Permission.deleteOne({ fileId: file._id, grantedTo: targetUser._id });
    res.json({ message: `Access revoked from ${username}` });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/files/:id
export const deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.ownerId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Access denied" });

    await Permission.deleteMany({ fileId: file._id });
    await file.deleteOne();
    res.json({ message: "File deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
};