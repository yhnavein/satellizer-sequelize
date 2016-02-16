'use strict';

var bodyParser = require('body-parser');
//var cors = require('cors');
var express = require('express');
var logger = require('morgan');
var Promise = require('bluebird');

var app = express();

app.set('port', process.env.PORT || 3002);
app.use(function (req, res, next) {
  res.setHeader('Cache-Control', 'no-cache, no-store');
  next();
});
//app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

Promise.longStackTraces();

var db = require('./models/sequelize');
var authController = require('./controllers/authController.js');
var userController = require('./controllers/userController.js');

app.use('/api/auth', authController);
app.use('/api/user', userController);

/*
 |--------------------------------------------------------------------------
 | Start the Server
 |--------------------------------------------------------------------------
 */
db
  .sequelize
  .sync({ force: false })
  .then(function() {
    app.listen(app.get('port'), function() {
      console.log('Example Sequelize Server listening on port %d in %s mode', app.get('port'), app.get('env'));
    });
  });
