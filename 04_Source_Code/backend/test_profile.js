const assert = require('assert');

const API_URL = 'http://localhost:5000/api';
const PASSWORD = 'Password123'; // assuming this is the password or I can just login as accountant@test.com to check structure

async function login(email, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const cookie = res.headers.get('set-cookie') || '';
  return cookie;
}

async function runTest() {
  const cookie = await login('accountant@test.com', 'Password123');
  
  const res = await fetch(`${API_URL}/profile`, { headers: { Cookie: cookie } });
  const data = await res.json();
  
  console.log("Profile Data:", data);
}

runTest().catch(console.error);
