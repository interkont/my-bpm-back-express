import passport from 'passport';
import { Strategy, ExtractJwt, type StrategyOptions, type VerifiedCallback } from 'passport-jwt';
import { config } from './index';
import { User } from '../models';
import type { AuthUser } from '../domain/types';

// Carga útil del JWT emitido en el login.
interface JwtPayload {
  id: number;
  roleIds?: AuthUser['roleIds'];
  systemRole: AuthUser['systemRole'];
}

const options: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwt.secret,
};

const verifyUser = async (payload: JwtPayload, done: VerifiedCallback): Promise<void> => {
  try {
    const user = await User.findByPk(payload.id);

    if (user) {
      // Se descarta passwordHash: req.user es interno y nunca debe llevar el hash (FR-010).

      const { passwordHash: _passwordHash, ...plainUser } = user.get({ plain: true });
      const userWithRoles: AuthUser = {
        ...plainUser,
        roleIds: payload.roleIds,
        systemRole: payload.systemRole,
      };

      done(null, userWithRoles);
      return;
    }

    done(null, false);
  } catch (error) {
    done(error, false);
  }
};

passport.use(
  new Strategy(options, (payload: JwtPayload, done: VerifiedCallback): void => {
    void verifyUser(payload, done);
  }),
);

export { passport };
