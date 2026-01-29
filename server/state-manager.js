class StateManager {
    constructor() {
        this.roomStates = new Map(); // roomId -> { strokes: [], undoStack: [] }
    }

    getOrCreateRoomState(roomId) {
        if (!this.roomStates.has(roomId)) {
            this.roomStates.set(roomId, {
                strokes: [],
                undoStack: [] // This could also be per-user if needed, but per-room is fine for simple redo
            });
        }
        return this.roomStates.get(roomId);
    }

    addStroke(roomId, userId, stroke) {
        try {
            const state = this.getOrCreateRoomState(roomId);

            // Tag stroke with userId for per-user undo
            const strokeWithMetadata = { ...stroke, userId };

            // Limit history
            if (state.strokes.length > 3000) {
                state.strokes.shift();
            }

            state.strokes.push(strokeWithMetadata);
            // Redo stack is usually cleared on new strokes
            state.undoStack = state.undoStack.filter(s => s.userId !== userId);

            console.log(`[State] Stroke by ${userId} added to room ${roomId}. Total: ${state.strokes.length}`);
        } catch (err) {
            console.error('Failed to add stroke to state:', err);
        }
    }

    undo(roomId, userId) {
        const state = this.getOrCreateRoomState(roomId);
        // Find the last stroke by this user
        for (let i = state.strokes.length - 1; i >= 0; i--) {
            if (state.strokes[i].userId === userId) {
                const [removed] = state.strokes.splice(i, 1);
                state.undoStack.push(removed);
                return state.strokes;
            }
        }
        return null; // No strokes to undo for this user
    }

    redo(roomId, userId) {
        const state = this.getOrCreateRoomState(roomId);
        // Find the last undone stroke by this user
        // We look for the most recently added item in undoStack that belongs to user
        for (let i = state.undoStack.length - 1; i >= 0; i--) {
            if (state.undoStack[i].userId === userId) {
                const [restored] = state.undoStack.splice(i, 1);
                state.strokes.push(restored);
                return state.strokes;
            }
        }
        return null; // Nothing to redo
    }

    clear(roomId) {
        const state = this.getOrCreateRoomState(roomId);
        state.strokes = [];
        state.undoStack = [];
    }

    getStrokes(roomId) {
        return this.getOrCreateRoomState(roomId).strokes;
    }
}

module.exports = new StateManager();
