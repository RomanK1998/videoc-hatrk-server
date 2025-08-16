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

io.on("connection", (socket) => {
    console.log("New connection:", socket.id);

    socket.on("join-room", ({ roomID, name }) => {
        socket.join(roomID);
        socket.data.name = name;

        // уведомление остальных о новом пользователе
        const otherUsers = Array.from(io.sockets.adapter.rooms.get(roomID) || []).filter(id => id !== socket.id);
        otherUsers.forEach(id => io.to(id).emit("user-joined", { id: socket.id, name }));

        // отправка текущих пользователей новому подключившемуся
        const existingUsers = otherUsers.map(id => {
            const s = io.sockets.sockets.get(id);
            return { id: s.id, name: s.data.name || "Гость" };
        });
        if(existingUsers.length) socket.emit("existing-users", existingUsers);
    });

    socket.on("offer", ({ roomID, offer }) => socket.to(roomID).emit("offer", { from: socket.id, offer }));
    socket.on("answer", ({ roomID, answer }) => socket.to(roomID).emit("answer", { from: socket.id, answer }));
    socket.on("ice-candidate", ({ roomID, candidate }) => socket.to(roomID).emit("ice-candidate", { from: socket.id, candidate }));

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);
    });
});

server.listen(3000, () => console.log("Server running on port 3000"));
