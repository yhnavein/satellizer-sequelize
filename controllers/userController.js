'use strict';

var express = require('express');
var router = express.Router();
var UserRepo = require('../repositories/UserRepository');
var authHelper = require('../helpers/authHelper');


router.get('/me', authHelper.ensureAuthenticated, function(req, res) {
  UserRepo.getUserById(req.user)
    .then(function(user) {
      res.send(user);
    })
    .catch(function(err) {
      console.log('Error occured', err);
      return res.status(400).send({ message: 'Error occured' });
    });
});

router.put('/me', authHelper.ensureAuthenticated, function(req, res) {
  UserRepo.changeAccountData(req.user, req.body)
    .then(function() {
      res.status(200).end();
    })
    .catch(function(err) {
      console.log('Error occured', err);
      return res.status(400).send({ message: 'Error occured' });
    });
});

module.exports = router;
