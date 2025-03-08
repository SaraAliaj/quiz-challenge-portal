import WebSocket from 'ws';

// Create WebSocket connection
const ws = new WebSocket('ws://localhost:8000/ws');

// Connection opened
ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Send a test message
  const testMessage = '123|What is this lesson about?';
  console.log(`Sending test message: ${testMessage}`);
  ws.send(testMessage);
});

// Listen for messages
ws.on('message', (data) => {
  console.log('Received message from server:');
  try {
    const jsonData = JSON.parse(data);
    console.log(JSON.stringify(jsonData, null, 2));
  } catch (e) {
    console.log(data.toString());
  }
});

// Handle errors
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Connection closed
ws.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

// Close the connection after 10 seconds
setTimeout(() => {
  console.log('Closing connection...');
  ws.close();
}, 10000); 