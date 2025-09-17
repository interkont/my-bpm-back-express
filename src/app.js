require('dotenv').config();
const express = require('express');
const path = require('path'); // <-- Añadido
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');
const errorMiddleware = require('./middlewares/error.middleware');
const routes = require('./routes');

const app = express();

// Middlewares
app.use(express.json());
app.use(helmet());
app.use(cors());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '../public'))); // <-- Añadido

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Passport Middleware
app.use(passport.initialize());

// Rutas de la API bajo el prefijo /api
app.use('/api', routes);

// La antigua ruta raíz app.get('/', ...) será eliminada. 
// express.static se encarga de la ruta raíz automáticamente.

// Error Handling Middleware
app.use(errorMiddleware);

// --- INICIO DEL CÓDIGO MODIFICADO ---

// Helper para parsear el argumento --port desde la línea de comandos
const getPortFromArgs = () => {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  return null;
};

// Determinar el puerto con un orden de prioridad claro:
// 1. Variable de entorno (método estándar para IDX, Heroku, etc.)
// 2. Argumento en línea de comandos (para manejar el comportamiento de este entorno)
// 3. Valor por defecto.
const PORT = process.env.PORT || getPortFromArgs() || 3000;

// --- FIN DEL CÓDIGO MODIFICADO ---

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
