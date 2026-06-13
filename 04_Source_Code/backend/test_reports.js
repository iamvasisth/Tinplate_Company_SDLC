require("dotenv").config();
const { getProfitAndLoss, getTrialBalance } = require('./src/controllers/reportsController');

const req = {
  query: { start_date: '2026-05-31', end_date: '2026-06-04' },
  user: { id: 1 }
};

const res = {
  json: (data) => console.log('SUCCESS:', JSON.stringify(data, null, 2)),
  status: (code) => ({
    json: (data) => console.log(`ERROR ${code}:`, data)
  })
};

async function test() {
  console.log('Testing PnL...');
  await getProfitAndLoss(req, res);
  console.log('Testing Trial Balance...');
  await getTrialBalance(req, res);
  process.exit();
}
test();
