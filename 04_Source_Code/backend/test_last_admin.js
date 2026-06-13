const assert = require('assert');

const API_URL = 'http://localhost:5000/api';
const PASSWORD = 'Password123';

async function login(email) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD })
  });
  const cookie = res.headers.get('set-cookie') || '';
  return cookie;
}

async function runTest() {
  const cookie = await login('admin@test.com');
  
  // Get all users to find admin IDs
  const res = await fetch(`${API_URL}/users`, { headers: { Cookie: cookie } });
  const data = await res.json();
  if (!data.users) {
    console.log("No users array returned. Data was:", data);
    return;
  }
  const admins = data.users.filter(u => u.role === 'Admin');
  
  console.log(`Admins found: ${admins.length}`);
  
  // If multiple admins, demote them until 1 is left
  for (let i = 1; i < admins.length; i++) {
    await fetch(`${API_URL}/users/${admins[i].id}/role`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Viewer' })
    });
  }
  
  // Now there is 1 admin
  const res2 = await fetch(`${API_URL}/users`, { headers: { Cookie: cookie } });
  const data2 = await res2.json();
  const soleAdmin = data2.users.find(u => u.role === 'Admin');
  
  console.log(`Attempting to demote sole admin (${soleAdmin.email}) to Viewer...`);
  
  const demoteRes = await fetch(`${API_URL}/users/${soleAdmin.id}/role`, {
    method: 'PUT',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'Viewer' })
  });
  
  console.log(`Demote status: ${demoteRes.status}`);
  const demoteData = await demoteRes.json();
  console.log(`Response message: ${demoteData.message}`);
  
  assert.strictEqual(demoteRes.status, 400);
  console.log("✅ Last Admin protection is working!");
}

runTest().catch(console.error);
