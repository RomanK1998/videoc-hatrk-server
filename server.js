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

// Хранилище пользователей
let users = {}; // { socketId: { username, status, inCallWith } }

io.on("connection", (socket) => {

  console.log("Новое соединение:", socket.id);

  // Регистрация пользователя
  socket.on("register", (username, callback) => {
    users[socket.id] = { username, status: "online", inCallWith: null };
    updateUserList();
    callback({ success: true, id: socket.id });
  });

  // Создание звонка
  socket.on("call-user", (targetId, offer) => {
    if(users[targetId]){
      if(users[targetId].status === "busy"){
        // Если занят — уведомляем о возможности переключения
        socket.emit("user-busy", targetId);
        return;
      }
      users[socket.id].status = "busy";
      users[socket.id].inCallWith = targetId;
      users[targetId].status = "busy";
      users[targetId].inCallWith = socket.id;
      updateUserList();

      io.to(targetId).emit("incoming-call", socket.id, offer, users[socket.id].username);
    }
  });

  // Ответ на звонок
  socket.on("answer-call", (targetId, answer) => {
    if(users[targetId]){
      io.to(targetId).emit("call-answered", answer);
    }
  });

  // ICE кандидаты
  socket.on("ice-candidate", (targetId, candidate) => {
    if(users[targetId]){
      io.to(targetId).emit("ice-candidate", candidate);
    }
  });

  // Завершение звонка
  socket.on("end-call", () => {
    const targetId = users[socket.id]?.inCallWith;
    if(targetId && users[targetId]){
      users[targetId].status = "online";
      users[targetId].inCallWith = null;
      io.to(targetId).emit("call-ended");
    }
    if(users[socket.id]){
      users[socket.id].status = "online";
      users[socket.id].inCallWith = null;
    }
    updateUserList();
  });

  // Отключение
  socket.on("disconnect", () => {
    const targetId = users[socket.id]?.inCallWith;
    if(targetId && users[targetId]){
      users[targetId].status = "online";
      users[targetId].inCallWith = null;
      io.to(targetId).emit("call-ended");
    }
    delete users[socket.id];
    updateUserList();
  });

  function updateUserList(){
    io.emit("update-users", Object.keys(users).map(id => ({
      id,
      username: users[id].username,
      status: users[id].status
    })));
  }
});

server.listen(3000, () => console.log("Server running on port 3000"));
