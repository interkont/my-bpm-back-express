const authService = require('./auth.service');
const catchAsync = require('../../utils/catchAsync');

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const { user, token, modules } = await authService.login(email, password);
  res.json({ user, token, modules });
});

const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.json(user);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

module.exports = {
  login,
  updateProfile,
};
