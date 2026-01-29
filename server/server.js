const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const roomManager = require('./rooms');
const stateManager = require('./state-manager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, '../client')));

const users = new Map(); // socketId -> userData

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    const userColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    const userData = {
        id: socket.id,
        color: userColor,
        cursor: { x: 0, y: 0 },
        roomId: 'default'
    };
    users.set(socket.id, userData);

    // Join default room
    roomManager.joinRoom(socket, 'default');

    // Send current state
    socket.emit('init', {
        strokes: stateManager.getStrokes('default'),
        users: Array.from(users.values()).filter(u => u.roomId === 'default')
    });

    socket.to('default').emit('user-joined', userData);

    socket.on('cursor-move', (pos) => {
        const user = users.get(socket.id);
        if (user) {
            user.cursor = pos;
            socket.to(user.roomId).emit('user-cursor-move', { id: socket.id, cursor: pos });
        }
    });

    socket.on('stroke-finalize', (stroke) => {
        const user = users.get(socket.id);
        if (user) {
            stateManager.addStroke(user.roomId, socket.id, stroke);
            socket.to(user.roomId).emit('stroke-received', stroke);
        }
    });

    socket.on('remote-draw-start', (data) => {
        const user = users.get(socket.id);
        if (user) socket.to(user.roomId).emit('remote-draw-start', data);
    });

    socket.on('remote-draw-point', (data) => {
        const user = users.get(socket.id);
        if (user) socket.to(user.roomId).emit('remote-draw-point', data);
    });

    socket.on('remote-draw-end', (userId) => {
        const user = users.get(socket.id);
        if (user) socket.to(user.roomId).emit('remote-draw-end', userId);
    });

    socket.on('undo', () => {
        const user = users.get(socket.id);
        if (user) {
            const newStrokes = stateManager.undo(user.roomId, socket.id);
            if (newStrokes !== null) {
                io.to(user.roomId).emit('undo-occurred', { strokes: newStrokes });
            }
        }
    });

    socket.on('redo', () => {
        const user = users.get(socket.id);
        if (user) {
            const newStrokes = stateManager.redo(user.roomId, socket.id);
            if (newStrokes !== null) {
                io.to(user.roomId).emit('redo-occurred', { strokes: newStrokes });
            }
        }
    });

    socket.on('clear-canvas', () => {
        const user = users.get(socket.id);
        if (user) {
            stateManager.clear(user.roomId);
            io.to(user.roomId).emit('canvas-cleared');
        }
    });

    socket.on('ping', (cb) => { if (cb) cb(); });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        const user = users.get(socket.id);
        if (user) {
            roomManager.leaveRoom(socket);
            users.delete(socket.id);
            io.to(user.roomId).emit('user-left', socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
