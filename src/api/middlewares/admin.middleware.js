const isAdmin = (req, res, next) => {
  // Passport ya ha decodificado el token y ha adjuntado los datos del payload a req.user.
  // req.user incluye { id, roleIds, systemRole }.
  if (req.user && req.user.systemRole === 'ADMIN') {
    // Si el usuario existe y su systemRole es 'ADMIN', continuamos a la siguiente función.
    return next();
  }

  // Si no, devolvemos un error 403 Forbidden.
  return res.status(403).json({ message: 'Forbidden: Requires admin privileges.' });
};

module.exports = isAdmin;
