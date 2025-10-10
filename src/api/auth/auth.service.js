const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../../models');

const login = async (email, password) => {
  const user = await User.findOne({
    where: { email },
    include: [{ model: Role, as: 'roles' }]
  });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  const roleIds = user.roles.map(role => role.id);

  const tokenPayload = {
    id: user.id,
    roleIds: roleIds,
    systemRole: user.systemRole 
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

  const { passwordHash, ...userWithoutPassword } = user.get({ plain: true });
  
  return { user: userWithoutPassword, token };
};

const updateProfile = async (userId, data) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const { fullName, email, oldPassword, newPassword } = data;
  const updateData = {};

  if (fullName) updateData.fullName = fullName;
  if (email) updateData.email = email;
  
  if (newPassword) {
    if (!oldPassword) {
      const error = new Error('Old password is required to set a new password');
      error.statusCode = 400; // Bad Request
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      const error = new Error('Invalid old password');
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    updateData.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await user.update(updateData);

  const { passwordHash, ...userWithoutPassword } = user.get({ plain: true });
  return userWithoutPassword;
};

module.exports = {
  login,
  updateProfile,
};
