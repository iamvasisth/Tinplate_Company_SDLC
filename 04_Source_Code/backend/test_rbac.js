const assert = require('assert');

const API_URL = 'http://localhost:5000/api';
const PASSWORD = 'Password123';

const USERS = [
  { email: 'admin@test.com', role: 'Admin' },
  { email: 'accountant@test.com', role: 'Accountant' },
  { email: 'staff@test.com', role: 'Staff' },
  { email: 'viewer@test.com', role: 'Viewer' }
];

async function login(email) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD })
  });
  const cookie = res.headers.get('set-cookie') || '';
  return cookie;
}

async function testEndpoint(method, url, cookie, expectedStatus) {
  try {
    const config = {
      method: method.toUpperCase(),
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    };
    if (method === 'post' || method === 'put') {
      config.body = JSON.stringify({});
    }
    const res = await fetch(`${API_URL}${url}`, config);
    if (expectedStatus === 'allowed') {
      assert(res.status !== 403 && res.status !== 401, `Expected allowed, got ${res.status}`);
    } else {
      assert.strictEqual(res.status, expectedStatus, `Expected ${expectedStatus}, got ${res.status}`);
    }
    return { success: true, status: res.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function runTests() {
  console.log("Starting backend RBAC tests...\n");

  for (const u of USERS) {
    console.log(`--- Testing Role: ${u.role} (${u.email}) ---`);
    let cookie;
    try {
      cookie = await login(u.email);
      console.log('Login successful');
    } catch (e) {
      console.error(`Login failed for ${u.email}: ${e.message}`);
      continue;
    }

    // Define test cases based on user's requirements
    let tests = [];

    if (u.role === 'Admin') {
      tests = [
        { method: 'get', url: '/customers', expected: 'allowed' },
        { method: 'post', url: '/customers', expected: 'allowed' },
        { method: 'delete', url: '/customers/99999', expected: 'allowed' },
        { method: 'get', url: '/users', expected: 'allowed' },
      ];
    } else if (u.role === 'Accountant') {
      tests = [
        { method: 'get', url: '/customers', expected: 'allowed' },
        { method: 'post', url: '/customers', expected: 'allowed' },
        { method: 'get', url: '/reports/profit-loss', expected: 'allowed' },
        { method: 'put', url: '/users/99999/role', expected: 403 }, // Should be blocked
        { method: 'get', url: '/organization-settings', expected: 'allowed' }, // View only
        { method: 'put', url: '/organization-settings', expected: 403 }, // Manage blocked
      ];
    } else if (u.role === 'Staff') {
      tests = [
        { method: 'get', url: '/customers', expected: 'allowed' },
        { method: 'post', url: '/customers', expected: 'allowed' },
        { method: 'delete', url: '/customers/99999', expected: 403 },
        { method: 'get', url: '/users', expected: 403 },
        { method: 'get', url: '/organization-settings', expected: 403 },
        { method: 'post', url: '/vendors', expected: 403 },
      ];
    } else if (u.role === 'Viewer') {
      tests = [
        { method: 'get', url: '/customers', expected: 'allowed' },
        { method: 'post', url: '/customers', expected: 403 },
        { method: 'delete', url: '/customers/99999', expected: 403 },
        { method: 'get', url: '/reports/profit-loss', expected: 'allowed' },
        { method: 'get', url: '/users', expected: 403 },
      ];
    }

    for (const t of tests) {
      const result = await testEndpoint(t.method, t.url, cookie, t.expected);
      if (result.success) {
        console.log(`✅ ${t.method.toUpperCase()} ${t.url} -> Expected: ${t.expected}, Got: ${result.status}`);
      } else {
        console.log(`❌ ${t.method.toUpperCase()} ${t.url} -> Failed: ${result.error}`);
      }
    }
    console.log("");
  }
}

runTests();
