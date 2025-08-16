io.on("connection", (socket) => {
    socket.on("join-room", ({ roomID, name }) => {
        socket.join(roomID);
        socket.data.name = name;

        const otherUsers = Array.from(io.sockets.adapter.rooms.get(roomID) || []).filter(id => id !== socket.id);
        otherUsers.forEach(id => io.to(id).emit("user-joined", { id: socket.id, name }));

        const existingUsers = otherUsers.map(id => {
            const s = io.sockets.sockets.get(id);
            return { id: s.id, name: s.data.name || "Гость" };
        });
        if(existingUsers.length) socket.emit("existing-users", existingUsers);
    });

    socket.on("offer", ({ roomID, offer }) => socket.to(roomID).emit("offer", { from: socket.id, offer }));
    socket.on("answer", ({ roomID, answer }) => socket.to(roomID).emit("answer", { from: socket.id, answer }));
    socket.on("ice-candidate", ({ roomID, candidate }) => socket.to(roomID).emit("ice-candidate", { from: socket.id, candidate }));
});
