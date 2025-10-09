const passport = require('passport'); // <-- CAMBIO 1: Importar passport aquí
const { Strategy, ExtractJwt } = require('passport-jwt');
const { User } = require('../models');

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

// CAMBIO 2: Ya no exportamos una función, sino que configuramos directamente.
passport.use(
  new Strategy(options, async (payload, done) => {
    try {
      const user = await User.findByPk(payload.id);

      if (user) {
        const userWithRoles = user.get({ plain: true });
        userWithRoles.roleIds = payload.roleIds;
        userWithRoles.systemRole = payload.systemRole;
        
        return done(null, userWithRoles);
      }
      
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

module.exports = passport; // <-- CAMBIO 3: Exportar el objeto ya configurado.
