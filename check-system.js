import fetch from 'node-fetch';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

// Check if directories exist
console.log('Checking directory structure...');
const requiredDirs = [
  'frontend',
  'backend/node',
  'backend/python',
  'shared/uploads/pdfs',
  'shared/uploads/processed'
];

for (const dir of requiredDirs) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Directory not found: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`✅ Directory exists: ${dir}`);
  }
}

// Check Node.js backend
console.log('\nChecking Node.js backend...');
try {
  const nodeResponse = await fetch('http://localhost:3001/health', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (nodeResponse.ok) {
    const data = await nodeResponse.json();
    console.log(`✅ Node.js backend is running: ${JSON.stringify(data)}`);
  } else {
    console.error(`❌ Node.js backend returned status: ${nodeResponse.status}`);
  }
} catch (error) {
  console.error(`❌ Node.js backend is not running: ${error.message}`);
  console.log('   Make sure to start the Node.js backend with: npm run backend:node');
}

// Check Python backend
console.log('\nChecking Python backend...');
try {
  const pythonResponse = await fetch('http://localhost:8000/health', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (pythonResponse.ok) {
    const data = await pythonResponse.json();
    console.log(`✅ Python backend is running: ${JSON.stringify(data)}`);
  } else {
    console.error(`❌ Python backend returned status: ${pythonResponse.status}`);
  }
} catch (error) {
  console.error(`❌ Python backend is not running: ${error.message}`);
  console.log('   Make sure to start the Python backend with: npm run backend:python');
}

// Check WebSocket connection
console.log('\nChecking WebSocket connection...');
try {
  const ws = new WebSocket('ws://localhost:3001/ws');
  
  ws.on('open', () => {
    console.log('✅ WebSocket connection established');
    ws.close();
  });
  
  ws.on('error', (error) => {
    console.error(`❌ WebSocket connection failed: ${error.message}`);
    console.log('   Make sure the Node.js backend is running with WebSocket support');
  });
  
  // Wait for connection or timeout
  await new Promise(resolve => setTimeout(resolve, 3000));
} catch (error) {
  console.error(`❌ WebSocket connection failed: ${error.message}`);
}

console.log('\nSystem check complete. Fix any issues reported above to make the system fully functional.'); 