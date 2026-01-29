import { CanvasManager } from './canvas.js';
import { SocketClient } from './websocket.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvasManager = new CanvasManager('main-canvas');
    const socketClient = new SocketClient();

    // DOM Elements
    const toolBtns = document.querySelectorAll('.tool-btn');
    const colorPicker = document.getElementById('color-picker');
    const colorSwatches = document.querySelectorAll('.color-swatch');
    const widthRange = document.getElementById('width-range');
    const widthValue = document.getElementById('width-value');
    const clearBtn = document.getElementById('clear-btn');
    const downloadBtn = document.getElementById('download-btn');
    const userList = document.getElementById('user-list');
    const cursorsLayer = document.getElementById('cursors-layer');
    const statusText = document.getElementById('connection-status');
    const latencyText = document.getElementById('latency-display');
    const statusDot = document.getElementById('connection-dot');

    // UI State
    let onlineUsers = new Map();
    let remoteStrokeConfigs = new Map();

    // -- Canvas Events --
    canvasManager.onStrokeStart = (strokeConfig) => {
        socketClient.emitRemoteDrawStart(strokeConfig);
    };

    canvasManager.onDraw = (pos) => {
        socketClient.emitDrawPoint(pos);
    };

    canvasManager.onStrokeEnd = (finalStroke) => {
        socketClient.emitStrokeFinalize(finalStroke);
    };

    canvasManager.onMouseMove = (pos) => {
        socketClient.emitCursorMove(pos);
    };

    // -- Socket Events --
    socketClient.onInit = (data) => {
        if (statusText) {
            statusText.innerText = 'Connected';
            statusDot.style.background = '#10b981';
        }
        canvasManager.setStrokes(data.strokes);

        onlineUsers.clear();
        cursorsLayer.innerHTML = '';

        data.users.forEach(user => {
            if (user.id !== socketClient.userId) {
                onlineUsers.set(user.id, user);
                updateRemoteCursor(user.id, user.cursor, user.color);
            }
        });
        renderUserList();
    };

    socketClient.onError = (msg) => {
        if (statusText) {
            statusText.innerText = msg;
            statusDot.style.background = '#ef4444';
        }
    };

    socketClient.onDisconnect = () => {
        if (statusText) {
            statusText.innerText = 'Reconnecting...';
            statusDot.style.background = '#f59e0b';
        }
    };

    socketClient.onUserJoined = (user) => {
        onlineUsers.set(user.id, user);
        renderUserList();
        updateRemoteCursor(user.id, user.cursor, user.color);
    };

    socketClient.onUserLeft = (userId) => {
        onlineUsers.delete(userId);
        const cursor = document.getElementById(`cursor-${userId}`);
        if (cursor) cursor.remove();
        renderUserList();
    };

    socketClient.onCursorMove = (data) => {
        const user = onlineUsers.get(data.id);
        if (user) {
            user.cursor = data.cursor;
            updateRemoteCursor(data.id, data.cursor, user.color);
        }
    };

    socketClient.onStrokeReceived = (stroke) => {
        canvasManager.strokes.push(stroke);
        canvasManager.redraw();
    };

    socketClient.onRemoteDrawStart = (data) => {
        remoteStrokeConfigs.set(data.userId, data.stroke);
    };

    socketClient.onRemoteDrawPoint = (data) => {
        const config = remoteStrokeConfigs.get(data.userId);
        if (config) {
            canvasManager.drawRemotePoint(data.userId, data.pos, config);
        }
    };

    socketClient.onRemoteDrawEnd = (userId) => {
        canvasManager.endRemoteStroke(userId);
        remoteStrokeConfigs.delete(userId);
    };

    socketClient.onUndoRedo = (strokes) => {
        canvasManager.setStrokes(strokes);
    };

    socketClient.onClear = () => {
        canvasManager.clear();
    };

    socketClient.onLatency = (ms) => {
        if (latencyText) latencyText.innerText = `Latency: ${ms}ms`;
    };

    // -- UI Listeners --
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.id === 'tool-undo') {
                socketClient.emitUndo();
                return;
            }
            if (btn.id === 'tool-redo') {
                socketClient.emitRedo();
                return;
            }

            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.id === 'tool-brush') canvasManager.setTool('brush');
            if (btn.id === 'tool-eraser') canvasManager.setTool('eraser');
        });
    });

    colorPicker.addEventListener('input', (e) => {
        canvasManager.setColor(e.target.value);
    });

    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const color = swatch.dataset.color;
            colorPicker.value = color;
            canvasManager.setColor(color);
        });
    });

    widthRange.addEventListener('input', (e) => {
        const val = e.target.value;
        if (widthValue) widthValue.innerText = `${val}px`;
        canvasManager.setWidth(parseInt(val));
    });

    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the canvas for everyone?')) {
            socketClient.emitClear();
        }
    });

    downloadBtn.addEventListener('click', () => {
        // Create a temporary canvas to include the background color
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasManager.canvas.width;
        tempCanvas.height = canvasManager.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // 1. Draw solid white background
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // 2. Draw the current canvas content on top
        tempCtx.drawImage(canvasManager.canvas, 0, 0);

        // 3. Download the result
        const link = document.createElement('a');
        link.download = 'collab-whiteboard.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    });

    // -- Helper Functions --
    function updateRemoteCursor(userId, pos, color) {
        let cursor = document.getElementById(`cursor-${userId}`);
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = `cursor-${userId}`;
            cursor.className = 'remote-cursor';
            cursor.innerHTML = `
                <div class="cursor-pointer" style="background: ${color}"></div>
                <div class="cursor-label" style="border-left: 2px solid ${color}">${userId.slice(0, 5)}</div>
            `;
            cursorsLayer.appendChild(cursor);
        }
        // Map normalized coordinates (1600x900) back to visual display
        const rect = canvasManager.canvas.getBoundingClientRect();
        const visualX = (pos.x / canvasManager.canvas.width) * rect.width;
        const visualY = (pos.y / canvasManager.canvas.height) * rect.height;
        cursor.style.transform = `translate(${visualX}px, ${visualY}px)`;
    }

    function renderUserList() {
        if (!userList) return;
        userList.innerHTML = '';

        // Add current user
        const meItem = document.createElement('li');
        meItem.className = 'user-item';
        meItem.innerHTML = `
            <span class="user-color-dot" style="background: ${canvasManager.color}"></span>
            <span>You (${socketClient.userId?.slice(0, 5) || '...'})</span>
        `;
        userList.appendChild(meItem);

        // Add remote users
        onlineUsers.forEach((user, id) => {
            const item = document.createElement('li');
            item.className = 'user-item';
            item.innerHTML = `
                <span class="user-color-dot" style="background: ${user.color}"></span>
                <span>User ${id.slice(0, 5)}</span>
            `;
            userList.appendChild(item);
        });
    }
});
