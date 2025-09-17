const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  // No devolver el hash de la contraseña
  const { passwordHash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

module.exports = {
  login,
};
