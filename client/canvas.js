export class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentStroke = null;
        this.strokes = [];
        this.tool = 'brush'; // 'brush' or 'eraser'
        this.color = '#7c3aed';
        this.width = 5;

        // Remote drawing buffers
        this.remoteStrokes = new Map();

        this.init();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    init() {
        // Mouse Events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch Events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleMove(e.touches[0]);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopDrawing();
        }, { passive: false });
    }

    resize() {
        // We use a fixed internal resolution for the "board"
        // so that coordinates are consistent for all users.
        if (this.canvas.width !== 1600 || this.canvas.height !== 900) {
            this.canvas.width = 1600;
            this.canvas.height = 900;
            this.redraw();
        }
    }

    setTool(tool) {
        this.tool = tool;
    }

    setColor(color) {
        this.color = color;
    }

    setWidth(width) {
        this.width = width;
    }

    /**
     * Maps screen coordinates to internal canvas coordinates.
     * Accounts for CSS scaling and bounding rect offsets.
     */
    getCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getCoords(e);
        this.currentStroke = {
            points: [pos],
            color: this.tool === 'eraser' ? 'eraser' : this.color,
            width: this.width,
            tool: this.tool
        };

        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.tool === 'eraser' ? '#ffffff' : this.color;
        this.ctx.lineWidth = this.width;

        if (this.onStrokeStart) this.onStrokeStart({
            color: this.currentStroke.color,
            width: this.currentStroke.width,
            tool: this.currentStroke.tool
        });
    }

    handleMove(e) {
        const pos = this.getCoords(e);
        if (this.onMouseMove) this.onMouseMove(pos); // For cursor sync

        if (!this.isDrawing) return;

        const pts = this.currentStroke.points;
        const lastPt = pts[pts.length - 1];

        // Path Optimization: Ignore micro-movements
        const dist = Math.hypot(pos.x - lastPt.x, pos.y - lastPt.y);
        if (dist < 3) return;

        pts.push(pos);

        this.ctx.beginPath();
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.tool === 'eraser' ? '#ffffff' : this.color;
        this.ctx.lineWidth = this.width;

        if (pts.length < 3) {
            this.ctx.moveTo(pts[0].x, pts[0].y);
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        } else {
            this.ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length - 2; i++) {
                const xc = (pts[i].x + pts[i + 1].x) / 2;
                const yc = (pts[i].y + pts[i + 1].y) / 2;
                this.ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
            }
            this.ctx.quadraticCurveTo(
                pts[pts.length - 2].x,
                pts[pts.length - 2].y,
                pts[pts.length - 1].x,
                pts[pts.length - 1].y
            );
            this.ctx.stroke();
        }

        if (this.onDraw) this.onDraw(pos);
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.currentStroke && this.currentStroke.points.length > 1) {
            this.strokes.push(this.currentStroke);
            if (this.onStrokeEnd) this.onStrokeEnd(this.currentStroke);
        }
        this.redraw();
        this.currentStroke = null;
    }

    drawRemotePoint(userId, pos, strokeConfig) {
        if (!this.remoteStrokes.has(userId)) {
            this.remoteStrokes.set(userId, {
                lastPos: pos,
                points: [pos],
                config: strokeConfig
            });
            return;
        }

        const remote = this.remoteStrokes.get(userId);
        remote.points.push(pos);

        this.ctx.beginPath();
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = strokeConfig.tool === 'eraser' ? '#ffffff' : strokeConfig.color;
        this.ctx.lineWidth = strokeConfig.width;

        this.ctx.moveTo(remote.lastPos.x, remote.lastPos.y);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();

        remote.lastPos = pos;
    }

    endRemoteStroke(userId) {
        this.remoteStrokes.delete(userId);
        this.redraw();
    }

    setStrokes(strokes) {
        this.strokes = Array.isArray(strokes) ? strokes : [];
        this.redraw();
    }

    redraw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.strokes.forEach(stroke => {
            if (!stroke.points || stroke.points.length < 2) return;

            this.ctx.beginPath();
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
            this.ctx.lineWidth = stroke.width;

            const pts = stroke.points;
            this.ctx.moveTo(pts[0].x, pts[0].y);

            for (let i = 1; i < pts.length - 2; i++) {
                const xc = (pts[i].x + pts[i + 1].x) / 2;
                const yc = (pts[i].y + pts[i + 1].y) / 2;
                this.ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
            }

            if (pts.length > 2) {
                this.ctx.quadraticCurveTo(
                    pts[pts.length - 2].x,
                    pts[pts.length - 2].y,
                    pts[pts.length - 1].x,
                    pts[pts.length - 1].y
                );
            }
            this.ctx.stroke();
        });
    }

    clear() {
        this.strokes = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
