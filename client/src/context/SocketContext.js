import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { setSocketId } from "../utils/api";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    // In local dev there's no env var set, so we fall back to swapping
    // CRA's :3000 for the API server's :5000 on the same host. In
    // production this must be REACT_APP_SOCKET_URL, set at build time to
    // your deployed backend's URL (e.g. https://your-backend.onrender.com) —
    // the "3000→5000" replace trick only makes sense on localhost.
    const socketUrl =
      process.env.REACT_APP_SOCKET_URL ||
      window.location.origin.replace("3000", "5000");

    const s = io(socketUrl, {
      transports: ["websocket", "polling"],
    });

    s.on("connect", () => {
      setConnected(true);
      setSocketId(s.id);
      console.log("🔌 Socket connected");
    });

    s.on("disconnect", () => {
      setConnected(false);
      setSocketId(null);
      console.log("🔌 Socket disconnected");
    });

    s.on("presence:update", ({ count }) => {
      setOnlineCount(count);
    });

    setSocket(s);

    return () => {
      s.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineCount, socketId: socket?.id }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
