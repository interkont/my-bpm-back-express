require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet =require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport'); // <-- Revertido a la importación original
const errorMiddleware = require('./api/middlewares/error.middleware');
const routes = require('./api/routes');
const sequelize = require('./config/database');

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());

app.use(express.static(path.join(__dirname, '../public')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use(passport.initialize()); // <-- Esto ahora funcionará de nuevo

app.use('/api', routes);

app.use(errorMiddleware);

const getPortFromArgs = () => {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  return null;
};

const PORT = process.env.PORT || getPortFromArgs() || 3000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
