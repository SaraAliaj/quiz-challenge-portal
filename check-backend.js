// Simple script to check if the backend is running
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/lessons',
  method: 'GET'
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
      console.log('Total Lessons:', parsedData.data.length);
      
      if (parsedData.data.length > 0) {
        console.log('Sample Lesson:');
        console.log(parsedData.data[0]);
      }
    } catch (error) {
      console.error('Error parsing response:', error);
    }
  });
});

req.on('error', (error) => {
  console.error('Error making request:', error.message);
});

req.end(); 