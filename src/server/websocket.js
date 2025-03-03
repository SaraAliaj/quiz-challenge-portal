const { Server } = require('socket.io');
const { createServer } = require('http');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Keep track of active lessons and their timers
const activeLessons = new Map();

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('startLesson', (data) => {
    const { lessonId, lessonName, duration } = data;
    
    // Store lesson info
    activeLessons.set(lessonId, {
      name: lessonName,
      duration,
      startTime: new Date(),
      timer: setTimeout(() => {
        // Automatically end lesson when time is up
        io.emit('lessonEnded', { lessonId, lessonName });
        activeLessons.delete(lessonId);
      }, duration * 60 * 1000)
    });

    // Broadcast to all clients except sender
    socket.broadcast.emit('lessonStarted', data);
    console.log('Lesson started:', data);
  });

  socket.on('endLesson', (data) => {
    const { lessonId } = data;
    
    // Clear the timer if exists
    const lessonData = activeLessons.get(lessonId);
    if (lessonData) {
      clearTimeout(lessonData.timer);
      activeLessons.delete(lessonId);
    }

    // Broadcast to all clients
    io.emit('lessonEnded', data);
    console.log('Lesson ended:', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Clean up on server shutdown
process.on('SIGINT', () => {
  // Clear all active timers
  for (const [lessonId, lesson] of activeLessons) {
    clearTimeout(lesson.timer);
  }
  activeLessons.clear();
  process.exit(0);
});

const PORT = process.env.WEBSOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
}); 