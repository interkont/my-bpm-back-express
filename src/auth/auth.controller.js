const authService = require('./auth.service');
const catchAsync = require('../utils/catchAsync');

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const { user, token } = await authService.login(email, password);
  res.json({ user, token });
});

module.exports = {
  login,
};
