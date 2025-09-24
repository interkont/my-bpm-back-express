const config = require('config');

module.exports = {
  App: config.get('App'),
  db: config.get('db'),
};
