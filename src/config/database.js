const { Sequelize } = require('sequelize');
const config = require('./index');
const logger = require('../utils/logger');

const sequelize = new Sequelize(config.db.databaseUrl, {
  dialect: 'postgres',
  logging: false,
});

module.exports = sequelize;
