const { User } = require('../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ sub: user.id, roleId: user.roleId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const { passwordHash, ...userWithoutPassword } = user.get({ plain: true }); // Usamos .get({ plain: true }) para obtener un objeto plano de la instancia de Sequelize
  return { user: userWithoutPassword, token };
};

module.exports = {
  login,
};
