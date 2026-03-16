import { io } from "socket.io-client";

let socketInstance = null;

export const getSocket = () => {
  if (socketInstance) return socketInstance;

  const token = localStorage.getItem("token");

  socketInstance = io(import.meta.env.VITE_API_BASE_URL || "http://localhost:3000", {
    transports: ["websocket"],
    auth: {
      token,
    },
  });

  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};