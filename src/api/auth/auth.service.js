const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../../models'); // Corregido para apuntar a la carpeta correcta

const login = async (email, password) => {
  const user = await User.findOne({
    where: { email },
    include: [{ model: Role, as: 'roles' }] // Ahora se incluye 'roles' en plural
  });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // --- INICIO DE LA MODIFICACIÓN QUIRÚRGICA ---
  // Ahora incluimos un array de IDs de roles en el token.
  const roleIds = user.roles.map(role => role.id);

  const tokenPayload = {
    id: user.id,
    roleIds: roleIds, // <-- CAMBIO a 'roleIds'
    systemRole: user.systemRole 
  };
  // --- FIN DE LA MODIFICACIÓN QUIRÚRGICA ---

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

  const { passwordHash, ...userWithoutPassword } = user.get({ plain: true });
  
  return { user: userWithoutPassword, token };
};

module.exports = {
  login,
};
