class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> Set of socketIds
        this.userToRoom = new Map(); // socketId -> roomId
    }

    joinRoom(socket, roomId = 'default') {
        // Leave current room if any
        this.leaveRoom(socket);

        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }

        this.rooms.get(roomId).add(socket.id);
        this.userToRoom.set(socket.id, roomId);
        socket.join(roomId);

        return roomId;
    }

    leaveRoom(socket) {
        const roomId = this.userToRoom.get(socket.id);
        if (roomId) {
            const room = this.rooms.get(roomId);
            if (room) {
                room.delete(socket.id);
                if (room.size === 0) {
                    this.rooms.delete(roomId);
                }
            }
            this.userToRoom.delete(socket.id);
            socket.leave(roomId);
        }
    }

    getUsersInRoom(roomId) {
        return this.rooms.get(roomId) || new Set();
    }
}

module.exports = new RoomManager();
