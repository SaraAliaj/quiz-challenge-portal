// Script to check if the lessons API is returning the correct data
import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/lessons',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('Checking lessons API...');

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
      } else {
        console.log('No lessons found in the response.');
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error making request:', error.message);
});

req.end(); 