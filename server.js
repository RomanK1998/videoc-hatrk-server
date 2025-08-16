const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Простая маршрутизация для статических файлов
app.use(express.static("public")); // HTML/JS/CSS кладем в папку public

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join-room", (roomID) => {
    socket.join(roomID);
    console.log(`${socket.id} joined room ${roomID}`);
    // Сообщаем другим в комнате о новом участнике
    socket.to(roomID).emit("user-joined", socket.id);
  });

  socket.on("offer", ({ roomID, offer }) => {
    socket.to(roomID).emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ roomID, answer }) => {
    socket.to(roomID).emit("answer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ roomID, candidate }) => {
    socket.to(roomID).emit("ice-candidate", { from: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
