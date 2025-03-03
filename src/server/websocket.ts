const { Server } = require('socket.io');
const { createServer } = require('http');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('startLesson', (data) => {
    // Broadcast to all clients except sender
    socket.broadcast.emit('lessonStarted', data);
    console.log('Lesson started:', data);
  });

  socket.on('endLesson', (data) => {
    // Broadcast to all clients except sender
    socket.broadcast.emit('lessonEnded', data);
    console.log('Lesson ended:', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.WEBSOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});