const fetch = require('node-fetch');

async function test() {
  const res = await fetch("http://localhost:5000/api/dashboard/monthly-finance-summary?month=5&year=2026", {
    headers: { 'Cookie': 'token=your_token_here' } // This will fail auth if we don't have token
  });
  console.log(res.status, await res.text());
}
test();
