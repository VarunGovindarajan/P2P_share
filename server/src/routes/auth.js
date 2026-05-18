import express from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { getOnlineUsers } from "../socket/socketServer.js";
import User from "../models/User.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);

// Get online users with their usernames
router.get("/online-users", protect, async (req, res) => {
  try {
    const onlineIds = getOnlineUsers().filter((id) => id !== req.user.userId);
    const users = await User.find({ _id: { $in: onlineIds } }).select("username _id");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;