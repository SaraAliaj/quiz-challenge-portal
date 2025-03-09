// Script to check if the backend API is accessible
const http = require('http');

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
  console.log(`Status Code: ${res.statusCode}`);
  
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
      } else {
        console.log('Response data is not an array or is missing.');
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error making request:', error.message);
  console.log('The backend may not be running or is on a different port.');
});

req.on('timeout', () => {
  console.log('Request timed out');
  req.destroy();
});

req.end(); 