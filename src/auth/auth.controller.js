const authService = require('./auth.service');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);
    res.json({ user, token });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

module.exports = {
  login,
};
