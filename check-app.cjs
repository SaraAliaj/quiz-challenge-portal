// Script to check if both the frontend and backend are running properly
const http = require('http');

console.log('Checking if the application is running properly...');

// Check frontend
function checkFrontend() {
  return new Promise((resolve) => {
    const ports = [5173, 5174, 5175, 5176, 5177];
    let checkedPorts = 0;
    let frontendRunning = false;

    for (const port of ports) {
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'GET',
        timeout: 2000 // 2 second timeout
      };

      console.log(`Checking frontend on port ${port}...`);
      
      const req = http.request(options, (res) => {
        console.log(`Frontend port ${port} - Status Code: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          console.log(`Success! Frontend is accessible on port ${port}`);
          frontendRunning = true;
        }
        
        checkedPorts++;
        if (checkedPorts === ports.length) {
          resolve(frontendRunning);
        }
      });
      
      req.on('error', () => {
        checkedPorts++;
        if (checkedPorts === ports.length) {
          resolve(frontendRunning);
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        checkedPorts++;
        if (checkedPorts === ports.length) {
          resolve(frontendRunning);
        }
      });
      
      req.end();
    }
  });
}

// Check backend
function checkBackend() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/lessons',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 3000 // 3 second timeout
    };

    console.log('Checking backend API...');
    
    const req = http.request(options, (res) => {
      console.log(`Backend API - Status Code: ${res.statusCode}`);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          console.log('API Response:');
          console.log('Status:', parsedData.status);
          console.log('Message:', parsedData.message);
          
          if (parsedData.data && Array.isArray(parsedData.data)) {
            console.log('Total Lessons:', parsedData.data.length);
            
            if (parsedData.data.length > 0) {
              console.log('Sample Lesson:');
              console.log(parsedData.data[0]);
            } else {
              console.log('No lessons found in the response.');
            }
          }
          
          resolve(true);
        } catch (error) {
          console.error('Error parsing response:', error);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error making request to backend:', error.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('Backend request timed out');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function checkApplication() {
  const frontendRunning = await checkFrontend();
  const backendRunning = await checkBackend();
  
  console.log('\nApplication Status:');
  console.log('Frontend:', frontendRunning ? 'Running ✅' : 'Not Running ❌');
  console.log('Backend:', backendRunning ? 'Running ✅' : 'Not Running ❌');
  
  if (frontendRunning && backendRunning) {
    console.log('\n✅ The application is running properly!');
    console.log('You can access the frontend at http://localhost:5173 (or another port as indicated above)');
    console.log('The backend API is available at http://localhost:3001/api');
  } else {
    console.log('\n❌ There are issues with the application:');
    if (!frontendRunning) {
      console.log('- The frontend is not running. Try restarting the application with "npm run start".');
    }
    if (!backendRunning) {
      console.log('- The backend is not running. Check for port conflicts on 3001 and try killing any existing Node.js processes.');
    }
  }
}

checkApplication(); 