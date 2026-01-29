export class SocketClient {
    constructor() {
        this.socket = io();
        this.userId = null;
        this._lastCursorEmit = 0;
        this._lastPointEmit = 0;

        // Callbacks
        this.onUserUpdate = null;
        this.onStrokeReceived = null;
        this.onUndoRedo = null;
        this.onClear = null;
        this.onLatency = null;

        this.setupListeners();
    }

    setupListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.userId = this.socket.id;
        });

        this.socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            if (this.onError) this.onError('Connection failed. Retrying...');
        });

        this.socket.on('disconnect', (reason) => {
            console.warn('Socket disconnected:', reason);
            if (this.onDisconnect) this.onDisconnect();
        });

        // Initialize latency tracking
        this.trackLatency();

        // Basic ping-pong for latency
        this.socket.on('ping', (cb) => {
            if (cb) cb();
        });

        this.socket.on('init', (data) => {
            if (this.onInit) this.onInit(data);
        });

        this.socket.on('user-joined', (user) => {
            if (this.onUserJoined) this.onUserJoined(user);
        });

        this.socket.on('user-left', (userId) => {
            if (this.onUserLeft) this.onUserLeft(userId);
        });

        this.socket.on('user-cursor-move', (data) => {
            if (this.onCursorMove) this.onCursorMove(data);
        });

        this.socket.on('stroke-received', (stroke) => {
            if (this.onStrokeReceived) this.onStrokeReceived(stroke);
        });

        this.socket.on('undo-occurred', (data) => {
            if (this.onUndoRedo) this.onUndoRedo(data.strokes);
        });

        this.socket.on('redo-occurred', (data) => {
            if (this.onUndoRedo) this.onUndoRedo(data.strokes);
        });

        this.socket.on('canvas-cleared', () => {
            if (this.onClear) this.onClear();
        });

        // Remote live drawing events
        this.socket.on('remote-draw-start', (data) => {
            if (this.onRemoteDrawStart) this.onRemoteDrawStart(data);
        });

        this.socket.on('remote-draw-point', (data) => {
            if (this.onRemoteDrawPoint) this.onRemoteDrawPoint(data);
        });

        this.socket.on('remote-draw-end', (userId) => {
            if (this.onRemoteDrawEnd) this.onRemoteDrawEnd(userId);
        });
    }

    trackLatency() {
        setInterval(() => {
            if (this.socket.connected) {
                const start = Date.now();
                this.socket.emit('ping', () => {
                    const latency = Date.now() - start;
                    if (this.onLatency) this.onLatency(latency);
                });
            }
        }, 2000);
    }

    // Throttled cursor movement
    emitCursorMove(pos) {
        const now = Date.now();
        if (now - this._lastCursorEmit > 30) { // Max 33fps for cursor sync
            this.socket.emit('cursor-move', pos);
            this._lastCursorEmit = now;
        }
    }

    emitRemoteDrawStart(strokeConfig) {
        this.socket.emit('remote-draw-start', { userId: this.userId, stroke: strokeConfig });
    }

    // Throttled point emission
    emitDrawPoint(pos) {
        const now = Date.now();
        if (now - this._lastPointEmit > 16) { // Max 60fps for drawing sync
            this.socket.emit('remote-draw-point', { userId: this.userId, pos });
            this._lastPointEmit = now;
        }
    }

    emitStrokeFinalize(stroke) {
        this.socket.emit('stroke-finalize', stroke);
        this.socket.emit('remote-draw-end', this.userId);
    }

    emitUndo() {
        this.socket.emit('undo');
    }

    emitRedo() {
        this.socket.emit('redo');
    }

    emitClear() {
        this.socket.emit('clear-canvas');
    }
}
