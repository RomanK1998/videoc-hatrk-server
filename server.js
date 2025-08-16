const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET","POST"]
  }
});

io.on("connection", (socket) => {

  console.log("New socket connected:", socket.id);

  // Пользователь присоединяется к комнате
  socket.on("join-room", ({ roomID, name }) => {
    socket.join(roomID);
    socket.data.name = name; // сохраняем имя на сокете

    console.log(`${name} (${socket.id}) присоединился к комнате ${roomID}`);

    // Узнаем других участников комнаты
    const otherUsers = Array.from(io.sockets.adapter.rooms.get(roomID) || []).filter(id => id !== socket.id);

    // уведомляем других о новом пользователе
    otherUsers.forEach(id => io.to(id).emit("user-joined", { id: socket.id, name }));

    // Можно уведомить нового пользователя о существующих
    const existingUsers = otherUsers.map(id => {
      const s = io.sockets.sockets.get(id);
      return { id: s.id, name: s.data.name || "Гость" };
    });
    if(existingUsers.length) socket.emit("existing-users", existingUsers);
  });

  // Передача offer
  socket.on("offer", ({ roomID, offer }) => {
    socket.to(roomID).emit("offer", { from: socket.id, offer });
  });

  // Передача answer
  socket.on("answer", ({ roomID, answer }) => {
    socket.to(roomID).emit("answer", { from: socket.id, answer });
  });

  // Передача ICE-кандидатов
  socket.on("ice-candidate", ({ roomID, candidate }) => {
    socket.to(roomID).emit("ice-candidate", { from: socket.id, candidate });
  });

  // Отключение
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id} (${socket.data.name || "Гость"})`);
    // Уведомляем всех комнат
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    rooms.forEach(roomID => {
      socket.to(roomID).emit("user-left", { id: socket.id, name: socket.data.name || "Гость" });
    });
  });
});

// Для Render обычно порт из process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
