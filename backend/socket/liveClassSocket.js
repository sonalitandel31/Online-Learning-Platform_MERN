const jwt = require("jsonwebtoken");

let ioInstance = null;
// In-memory store for real-time presence tracking
const roomUsers = new Map();

const initLiveClassSocket = (io) => {
  ioInstance = io;

  // Authentication Middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // Attaches user info (id, role) to the socket
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    
    // --- ROOM JOIN & PRESENCE TRACKING ---
    socket.on("liveClass:joinRoom", ({ liveClassId, userProfile }) => {
      if (!liveClassId) return;
      const roomName = `liveClass:${liveClassId}`;
      socket.join(roomName);

      // Add user to presence map
      if (!roomUsers.has(roomName)) roomUsers.set(roomName, new Map());
      roomUsers.get(roomName).set(socket.id, { 
        userId: socket.user.id, 
        role: socket.user.role,
        name: userProfile?.name 
      });

      // Broadcast updated active user list to everyone in the room
      io.to(roomName).emit("liveClass:presenceUpdate", {
        activeCount: roomUsers.get(roomName).size,
        users: Array.from(roomUsers.get(roomName).values())
      });
    });

    // --- LIVE CHAT ---
    socket.on("liveClass:sendMessage", ({ liveClassId, message, sender }) => {
      if (!liveClassId) return;
      
      // Note: You can optionally call your liveClassChatController here to save to MongoDB
      
      // Broadcast message to everyone in the classroom
      io.to(`liveClass:${liveClassId}`).emit("liveClass:newMessage", {
        message,
        sender,
        timestamp: new Date()
      });
    });

    // --- LIVE Q&A ---
    socket.on("liveClass:askQuestion", ({ liveClassId, question, student }) => {
      if (!liveClassId) return;
      
      // Broadcast question to the instructor and students
      io.to(`liveClass:${liveClassId}`).emit("liveClass:newQuestion", {
        question,
        student,
        status: "unanswered",
        timestamp: new Date()
      });
    });

    // --- ROOM LEAVE & CLEANUP ---
    const handleLeaveRoom = (liveClassId, socketId) => {
      const roomName = `liveClass:${liveClassId}`;
      
      if (roomUsers.has(roomName)) {
        roomUsers.get(roomName).delete(socketId);
        
        // Broadcast new count
        io.to(roomName).emit("liveClass:presenceUpdate", {
          activeCount: roomUsers.get(roomName).size,
          users: Array.from(roomUsers.get(roomName).values())
        });
      }
    };

    socket.on("liveClass:leaveRoom", ({ liveClassId }) => {
      if (!liveClassId) return;
      socket.leave(`liveClass:${liveClassId}`);
      handleLeaveRoom(liveClassId, socket.id);
    });

    socket.on("disconnect", () => {
      // Find all rooms this socket was in and remove them
      roomUsers.forEach((usersMap, roomName) => {
        if (usersMap.has(socket.id)) {
          const liveClassId = roomName.split(":")[1];
          handleLeaveRoom(liveClassId, socket.id);
        }
      });
    });
  });
};

const emitToLiveClass = (liveClassId, eventName, payload) => {
  if (!ioInstance || !liveClassId) return;
  ioInstance.to(`liveClass:${liveClassId}`).emit(eventName, payload);
};

module.exports = {
  initLiveClassSocket,
  emitToLiveClass,
};