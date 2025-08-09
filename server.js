const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let users = [];

io.on("connection", (socket) => {
  console.log("Пользователь подключился:", socket.id);

  socket.on("join", () => {
    users.push(socket.id);
    console.log("Сейчас в комнате:", users);

    // Если пользователь первый — ждём второго
    // Если пользователь второй — говорим первому создать оффер
    if (users.length === 2) {
      io.to(users[0]).emit("create-offer");
    }
  });

  socket.on("offer", (offer) => {
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    socket.broadcast.emit("answer", answer);
  });

  socket.on("ice-candidate", (candidate) => {
    socket.broadcast.emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log("Пользователь отключился:", socket.id);
    users = users.filter(id => id !== socket.id);
  });
});

server.listen(3000, () => {
  console.log("Сервер запущен на порту 3000");
});
