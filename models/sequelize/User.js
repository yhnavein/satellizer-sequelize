'use strict';

var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');

var instanceMethods = {
  getGravatarUrl: function(size) {
    if (!size) size = 200;

    if (!this.email) {
      return 'https://gravatar.com/avatar/?s=' + size + '&d=retro';
    }

    var md5 = crypto.createHash('md5').update(this.email).digest('hex');
    return 'https://gravatar.com/avatar/' + md5 + '?s=' + size + '&d=retro';
  },
  hasSetPassword: function() {
    return this.password != null && this.password.length > 0;
  }
};

var beforeSaveHook = function(user, options, fn) {
  if(user.changed('password')) {
    this.encryptPassword(user.password, function(hash, err) {
      user.password = hash;
      fn(null, user);
    });
    return;
  }
  fn(null, user);
};

module.exports = function(db, DataTypes) {
  var User = db.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    password: DataTypes.STRING,
    googleId: {
      type: DataTypes.STRING,
      unique: true
    },
    facebookId: {
      type: DataTypes.STRING,
      unique: true
    },
    twitterId: {
      type: DataTypes.STRING,
      unique: true
    },
    githubId: {
      type: DataTypes.STRING,
      unique: true
    },
    resetPasswordExpires: DataTypes.DATE,
    resetPasswordToken: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    logins: DataTypes.INTEGER,
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      isEmail: true
    },
  }, {
    tableName: 'users',
    instanceMethods: instanceMethods,
    classMethods: {
      associate: function(models) {
        //User.hasMany(models.Role);
      },
      encryptPassword: function(password, cb) {
        if (!password) {
          cb('', null);
          return;
        }

        bcrypt.genSalt(10, function(err, salt) {
          if (err) { cb(null, err); return; }
          bcrypt.hash(password, salt, null, function(hErr, hash) {
            if (hErr) { cb(null, hErr); return; }
            cb(hash, null);
          });
        });
      },
      findUser: function(email, password, cb) {
        User.findOne({
          where: { email: email }
        })
        .then(function(user) {
          if(user == null || user.password == null || user.password.length === 0) {
            cb('User / Password combination is not correct', null);
            return;
          }
          bcrypt.compare(password, user.password, function(err, res) {
            if(res)
              cb(null, user);
            else
              cb(err, null);
          });
        })
        .catch(function(serr) { cb(serr, null); });
      }
    },
    hooks: {
      beforeUpdate: beforeSaveHook,
      beforeCreate: beforeSaveHook
    },
    indexes: [
      {
        name: 'users_facebookIdIndex',
        method: 'BTREE',
        fields: ['facebookId']
      },
      {
        name: 'users_googleIdIndex',
        method: 'BTREE',
        fields: ['googleId']
      },
      {
        name: 'users_twitterIdIndex',
        method: 'BTREE',
        fields: ['twitterId']
      },
      {
        name: 'users_githubIdIndex',
        method: 'BTREE',
        fields: ['githubId']
      }
    ]
  });

  return User;
};