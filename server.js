const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const roomName = "mainRoom";

io.on("connection", (socket) => {
  socket.join(roomName);

  socket.on("send-location", (location) => {
    socket.data.location = location;
    socket.to(roomName).emit("user-location", {
      id: socket.id,
      location
    });
  });

  socket.on("offer", (offer) => {
    socket.to(roomName).emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    socket.to(roomName).emit("answer", answer);
  });

  socket.on("ice-candidate", (candidate) => {
    socket.to(roomName).emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    socket.to(roomName).emit("user-left", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
