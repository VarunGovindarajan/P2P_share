import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;
// Map userId -> socketId for targeted events
const onlineUsers = new Map();

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });


  // Auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

io.on("connection", (socket) => {
    const { userId, username } = socket.user;
    onlineUsers.set(userId, socket.id);

    console.log(`${username} connected`);
    io.emit("online-users", Array.from(onlineUsers.keys()));

    // WebRTC Signaling
    socket.on("webrtc-offer", ({ targetUserId, offer, fileInfo }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-offer", {
          fromUserId: userId,
          fromUsername: username,
          offer,
          fileInfo,
        });
      }
    });

    socket.on("webrtc-answer", ({ targetUserId, answer }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-answer", { fromUserId: userId, answer });
      }
    });

    socket.on("webrtc-ice", ({ targetUserId, candidate }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-ice", { fromUserId: userId, candidate });
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      io.emit("online-users", Array.from(onlineUsers.keys()));
      console.log(`${username} disconnected`);
    });
  });

  return io;
};
  export const getOnlineUsers = () => Array.from(onlineUsers.keys());


// Notify a specific user by userId
export const notifyUser = (userId, event, data) => {
  const socketId = onlineUsers.get(userId.toString());
  if (socketId && io) {
    io.to(socketId).emit(event, data);
  }
};

// Broadcast to all connected users
export const broadcast = (event, data) => {
  if (io) io.emit(event, data);
};