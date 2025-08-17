const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let users = []; // {id, username, inCallWith}
let calls = {}; // roomId -> {callerId, calleeId}

io.on("connection", socket => {

  // Регистрация нового пользователя
  socket.on("register", ({ username }) => {
    const user = { id: socket.id, username, inCallWith: null };
    users.push(user);
    socket.emit("registered", user);
    io.emit("update-users", users);
  });

  // Инициирование звонка
  socket.on("call-user", ({ toId }) => {
    const from = users.find(u => u.id === socket.id);
    const to = users.find(u => u.id === toId);
    if (!to) return;

    if (!to.inCallWith) {
      const roomId = `room-${socket.id}-${toId}`;
      calls[roomId] = { callerId: from.id, calleeId: to.id };
      from.inCallWith = to.id;
      to.inCallWith = from.id;
      socket.join(roomId);
      io.to(to.id).emit("incoming-call", { fromId: from.id, fromName: from.username, roomId });
      io.emit("update-users", users);
    } else {
      io.to(to.id).emit("user-busy", { fromId: from.id, fromName: from.username });
    }
  });

  // Пользователь принял звонок
  socket.on("accept-call", ({ roomId }) => {
    socket.join(roomId);
    io.to(roomId).emit("start-webrtc", roomId);
    io.emit("update-users", users);
  });

  // Завершение звонка
  socket.on("end-call", ({ roomId }) => {
    const call = calls[roomId];
    if (!call) return;
    const caller = users.find(u => u.id === call.callerId);
    const callee = users.find(u => u.id === call.calleeId);
    if (caller) caller.inCallWith = null;
    if (callee) callee.inCallWith = null;
    delete calls[roomId];
    io.emit("update-users", users);
  });

  // ICE-кандидаты и WebRTC сигналы
  socket.on("offer", offer => socket.to(Object.keys(socket.rooms)[1]).emit("offer", offer));
  socket.on("answer", answer => socket.to(Object.keys(socket.rooms)[1]).emit("answer", answer));
  socket.on("ice-candidate", candidate => socket.to(Object.keys(socket.rooms)[1]).emit("ice-candidate", candidate));

  // Отключение пользователя
  socket.on("disconnect", () => {
    const user = users.find(u => u.id === socket.id);
    if (user && user.inCallWith) {
      const partner = users.find(u => u.id === user.inCallWith);
      if (partner) partner.inCallWith = null;
    }
    users = users.filter(u => u.id !== socket.id);
    io.emit("update-users", users);
  });
});

server.listen(3000, () => console.log("Server running on port 3000"));
