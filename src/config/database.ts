import { Sequelize } from 'sequelize';
import { config } from './index';

export const sequelize = new Sequelize(config.db.databaseUrl, {
  dialect: 'postgres',
  logging: false,
});
