const passport = require('passport');
const { Strategy, ExtractJwt } = require('passport-jwt');
const prisma = require('../utils/prisma');

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new Strategy(options, async (payload, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

module.exports = passport;
