import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export const useSocket = (token, handlers = {}) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    socketRef.current = io("http://localhost:5000", {
      auth: { token },
    });

    const socket = socketRef.current;

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return socketRef.current;
};