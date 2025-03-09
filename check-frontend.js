// Simple script to check if the frontend is running
const http = require('http');

// Try different ports
const ports = [5173, 5174, 5175, 5176, 5177];

console.log('Checking frontend accessibility on multiple ports...');

function checkPort(port) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'GET',
      timeout: 2000 // 2 second timeout
    };

    console.log(`Trying port ${port}...`);
    
    const req = http.request(options, (res) => {
      console.log(`Port ${port} - Status Code: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        console.log(`Success! Frontend is accessible on port ${port}`);
        resolve(true);
      } else {
        console.log(`Port ${port} returned a non-200 status code.`);
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      console.log(`Port ${port} - Error: ${error.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`Port ${port} - Request timed out`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function checkAllPorts() {
  let foundPort = false;
  
  for (const port of ports) {
    const result = await checkPort(port);
    if (result) {
      foundPort = true;
      break;
    }
  }
  
  if (!foundPort) {
    console.log('Could not connect to the frontend on any of the tried ports.');
    console.log('The application may not be running correctly.');
  }
}

checkAllPorts(); 