# CollabCanvas | Real-Time Collaborative Drawing

A high-performance, real-time drawing application built with Node.js and Socket.io.

## 🚀 Features
- **Real-time Sync**: See strokes as they are being drawn by other users.
- **Global Undo/Redo**: Coordinate history management across all participants.
- **User Presence**: Live cursor indicators and active user list.
- **Sleek UI**: Modern dark theme with glassmorphism and responsive design.
- **Tools**: Brush, Eraser, Color Picker, and Stroke Width adjustment.
- **Export**: Save your collaborative artwork as a PNG.

## 🛠️ Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or later)
- npm (installed with Node.js)

### Installation
1. Clone the repository or extract the files.
2. Open a terminal in the project directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. The application will be running at `http://localhost:3000`.

## 👥 How to Test with Multiple Users
1. Open `http://localhost:3000` in your primary browser.
2. Open the same URL in an Incognito window or a different browser (Firefox/Safari/Edge).
3. You will see both users in the "Online Users" list.
4. Move your mouse in one window to see the remote cursor in the other.
5. Start drawing and watch the lines appearing instantly on both canvases.

## 📝 Known Limitations
- **History Size**: Redrawing the entire canvas can become slower with thousands of strokes.
- **Eraser Implementation**: The eraser currently uses the background color to "mask" strokes. A more advanced implementation would involve destination-out compositing.
- **Canvas Scaling**: Resizing the window clears the current *drawn* state if not synchronized (mitigated by redrawing from history).

## 🕒 Time Spent
- Planning & Architecture: 30 mins
- Backend Implementation: 45 mins
- Canvas & Drawing Logic: 1 hour
- UI/UX & CSS: 1 hour
- Documentation: 30 mins
- **Total: ~4 hours**
