const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Socket.IO с правильным CORS
const io = new Server(server, {
    cors: {
        origin: "https://romank1998.github.io", // разрешаем фронтенд на GitHub Pages
        methods: ["GET","POST"],
        credentials: true
    }
});

// Обработка соединений
io.on("connection", socket => {
    console.log("Новое соединение:", socket.id);

    // Присоединение к комнате
    socket.on("join-room", ({ roomID, name }) => {
        console.log(`${name} (${socket.id}) присоединился к комнате ${roomID}`);
        socket.join(roomID);
        socket.data.name = name;

        const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);
        const otherClients = clients.filter(id => id !== socket.id);

        // Сообщаем новому пользователю о существующих клиентах
        const existingUsers = otherClients.map(id => {
            const s = io.sockets.sockets.get(id);
            return { id: s.id, name: s.data.name || "Гость" };
        });
        if(existingUsers.length) socket.emit("existing-users", existingUsers);

        // Уведомляем остальных о новом пользователе
        otherClients.forEach(id => {
            io.to(id).emit("user-joined", { id: socket.id, name });
        });
    });

    // Получение оффера
    socket.on("offer", ({ roomID, offer }) => {
        console.log(`Оффер от ${socket.id} в комнату ${roomID}`);
        socket.to(roomID).emit("offer", { from: socket.id, offer });
    });

    // Получение ответа
    socket.on("answer", ({ roomID, answer }) => {
        console.log(`Ответ от ${socket.id} в комнату ${roomID}`);
        socket.to(roomID).emit("answer", { from: socket.id, answer });
    });

    // Получение ICE-кандидата
    socket.on("ice-candidate", ({ roomID, candidate }) => {
        console.log(`ICE кандидат от ${socket.id} в комнату ${roomID}`, candidate ? candidate.candidate : null);
        socket.to(roomID).emit("ice-candidate", { from: socket.id, candidate });
    });

    socket.on("disconnect", () => {
        console.log("Отключение:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
