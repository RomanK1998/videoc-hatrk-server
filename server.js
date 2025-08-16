const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET","POST"] }
});

io.on("connection", socket => {
    console.log("New connection:", socket.id);

    socket.on("join-room", ({ roomID, name }) => {
        console.log(`${name} joined room ${roomID}`);
        socket.join(roomID);
        socket.data.name = name;

        const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);
        const otherClients = clients.filter(id => id !== socket.id);

        // Уведомляем других о новом пользователе
        otherClients.forEach(id => io.to(id).emit("user-joined", { id: socket.id, name }));

        // Сообщаем новому пользователю о других в комнате
        const existingUsers = otherClients.map(id => {
            const s = io.sockets.sockets.get(id);
            return { id: s.id, name: s.data.name || "Гость" };
        });
        if(existingUsers.length) socket.emit("existing-users", existingUsers);
    });

    socket.on("offer", ({ roomID, offer }) => socket.to(roomID).emit("offer", { from: socket.id, offer }));
    socket.on("answer", ({ roomID, answer }) => socket.to(roomID).emit("answer", { from: socket.id, answer }));
    socket.on("ice-candidate", ({ roomID, candidate }) => socket.to(roomID).emit("ice-candidate", { from: socket.id, candidate }));

    socket.on("disconnect", () => console.log("Disconnected:", socket.id));
});

// Render задаёт порт через переменную окружения
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
