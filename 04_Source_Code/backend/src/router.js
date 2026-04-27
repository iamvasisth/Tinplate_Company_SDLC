const { login } = require('./routes/auth');

function handleRoutes(req, res) {
  if (req.url === '/login') {
    login(req, res);
  } else {
    res.end('Route not found');
  }
}

module.exports = { handleRoutes };