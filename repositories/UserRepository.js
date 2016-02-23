'use strict';

var Promise = require('bluebird');

var db = require('../models/sequelize');

var PSW_RESET_TOKEN_VALID_FOR = 3; //hours
var ONE_HOUR = 3600000;
var repo = {};

repo.getUserById = function(id) {
  return db.User.find({
    where: { id: id },
    attributes: ['id', 'email', 'name', 'avatarUrl', 'googleId', 'facebookId', 'twitterId', 'githubId', 'instagramId', 'linkedinId', 'yahooId', 'liveId', 'foursquareId']
  });
};

repo.createUser = function(user) {
  return db.User.count({ where: { email: user.email } })
    .then(function(c) {
      if (c > 0)
        return Promise.reject('Account with that email address already exists.');

      var dbUser = db.User.build(user);
      return dbUser.save();
    });
};

repo.logInUser = function(email, psw, done) {
  email = email.toLowerCase().trim();
  db.User.findUser(email, psw, function(err, user) {
    if(err)
      return done(err, null);

    return done(null, user);
  });
};

repo.assignResetPswToken = function(email, token) {
  return db.User.findOne({ where: { email: email } })
    .then(function(user) {
      if(!user)
        return Promise.reject('No account with that email address exists.');

      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + PSW_RESET_TOKEN_VALID_FOR * ONE_HOUR;

      return user.save();
    });
};

repo.changeAccountData = function(userId, reqBody) {
  return db.User.findById(userId)
    .then(function(user) {
      user.email = reqBody.email || '';
      user.name = reqBody.name || '';
      user.avatarUrl = reqBody.avatarUrl || '';

      if(user.changed('email')) {
        return db.User.count({ where: { email: user.email } })
          .then(function(c) {
            if(c > 0)
              return Promise.reject('Cannot change e-mail address, because address ' + user.email + ' already exists');

            return user.save();
          });
      }

      return user.save();
    });
};

repo.findUserByResetPswToken = function(token) {
  return db.User.findOne({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    }
  });
};

repo.removeUserById = function(userId) {
  return db.User.destroy({ where: { id: userId } });
};

repo.changeUserPassword = function(userId, newPassword) {
  return db.User.findById(userId)
    .then(function(user) {
      if(!user)
        return Promise.reject('Account not found');

      user.password = newPassword;

      return user.save();
    });
};

repo.changeUserPswAndResetToken = function(token, newPassword) {
  if(!token || token.length < 1)
    return Promise.reject('Token cannot be empty!');

  return db.User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
      }
    })
    .then(function(user) {
      if(!user)
        return Promise.reject('User was not found.');

      user.password = newPassword;
      user.set('resetPasswordToken', null);
      user.set('resetPasswordExpires', null);

      return user.save();
    });
};

repo.unlinkProviderFromAccount = function(provider, userId) {

  return db.User.findById(userId)
    .then(function(user) {
      if(!user)
        return Promise.reject('User was not found.');

      var attrInfo = {};
      attrInfo[provider + 'Id'] = null;
      return user.updateAttributes(attrInfo);
    });
};

module.exports = repo;