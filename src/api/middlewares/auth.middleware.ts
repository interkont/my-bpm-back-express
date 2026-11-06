import type { RequestHandler } from 'express';
import passport from 'passport';

// `passport.authenticate` está tipado como `any` en @types/passport; se fija a RequestHandler.
export const protect: RequestHandler = passport.authenticate('jwt', {
  session: false,
}) as RequestHandler;
