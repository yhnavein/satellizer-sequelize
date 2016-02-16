'use strict';

var db = require('../models/sequelize');
var mask = require('json-mask');

var PSW_RESET_TOKEN_VALID_FOR = 3; //hours
var ONE_HOUR = 3600000;
var repo = {};

function addAvatarToProfile(provider, url, profile) {
  if(!profile.avatars)
    profile.avatars = {};

  if(!url || url.length < 1)
    return;

  profile.avatars[provider] = url;
  if(!profile.picture)
    profile.picture = url;
}

repo.getUserById = function(id) {
  return db.User.find({
    where: { id: id },
    attributes: ['id', 'googleId', 'facebookId', 'githubId', 'twitterId', 'email', 'profile']
  });
};

repo.createUser = function(user) {
  return db.User.count({ where: { email: user.email } })
    .then(function(c) {
      if (c > 0)
        throw 'Account with that email address already exists.';

      var dbUser = db.User.build(user);
      dbUser.set('profile', {});
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
        throw 'No account with that email address exists.';

      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + PSW_RESET_TOKEN_VALID_FOR * ONE_HOUR;

      return user.save();
    });
};

repo.changeAccountData = function(userId, reqBody) {
  return db.User.findById(userId)
    .then(function(user) {
      user.email = reqBody.email || '';
      user.profile.name = reqBody.profile.name || '';
      user.profile.picture = reqBody.profile.picture || '';
      user.set('profile', user.profile);

      if(user.changed('email')) {
        return db.User.count({ where: { email: user.email } })
          .then(function(c) {
            if(c > 0)
              throw 'Cannot change e-mail address, because address ' + user.email + ' already exists';

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
        throw 'Account not found';

      user.password = newPassword;

      return user.save();
    });
};

repo.changeUserPswAndResetToken = function(token, newPassword) {
  if(!token || token.length < 1)
    throw 'Token cannot be empty!';

  return db.User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
      }
    })
    .then(function(user) {
      if(!user)
        throw 'User was not found.';

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
        throw 'User was not found.';

      var attrInfo = {};
      attrInfo[provider + 'Id'] = null;
      return user.updateAttributes(attrInfo);
    });
};


/**
 * Facebook
 */
repo.linkFacebookProfile = function(userId, profile) {
  var profileId = profile.id;

  return db.User.findOne({ where: { facebookId: profileId } })
    .then(function(existingUser) {
      if (existingUser)
        throw 'There is already a Facebook account that belongs to you. Sign in with that account or delete it, then link it with your current account.';

      return db.User.findById(userId);
    })
    .then(function(user) {
      user.facebookId = profileId;
      if(!user.profile) user.profile = {};
      user.profile.name = user.profile.name || profile.name;
      addAvatarToProfile('facebook', 'https://graph.facebook.com/' + profileId + '/picture?type=large', user.profile);
      user.set('profile', user.profile);

      return user.save();
    });
};

repo.createAccFromFacebook = function(profile) {
  var profileId = profile.id;

  return db.User.findOne({ where: { facebookId: profileId } })
    .then(function(existingUser) {
      if (existingUser)
        return existingUser;

      return db.User.findOne({ where: { email: profile.email } })
        .then(function(emailUser) {
          if (emailUser)
            throw 'There is already an account using this email address. Sign in to that account and link it with Facebook manually from Account Settings.';

          var user = db.User.build({ facebookId: profileId });
          user.email = profile.email || ( profileId + '@facebook.com' );
          user.profile = {
            name: profile.name
          };
          addAvatarToProfile('facebook', 'https://graph.facebook.com/' + profileId + '/picture?type=large', user.profile);
          return user.save();
        });
    });
};


/**
 * GitHub
 */
repo.linkGithubProfile = function(userId, profile) {
  var profileId = profile.id.toString();

  return db.User.findOne({ where: { githubId: profileId } })
    .then(function(existingUser) {
      if (existingUser)
        throw 'There is already a GitHub account that belongs to you. Sign in with that account or delete it, then link it with your current account.';

      return db.User.findById(userId);
    })
    .then(function(user) {
      user.githubId = profileId;
      if(!user.profile) user.profile = {};
      user.profile.name = user.profile.name || profile.displayName;
      addAvatarToProfile('github', profile.avatar_url, user.profile);
      user.set('profile', user.profile);

      return user.save();
    });
};

repo.createAccFromGithub = function(profile) {
  var profileId = profile.id.toString();
  var email = (profile.login || profile.id) + '@github.com';

  return db.User.findOne({ where: { githubId: profileId } })
    .then(function(existingUser) {
      if (existingUser)
        return existingUser;

      return db.User.findOne({ where: { email: email } })
        .then(function(emailUser) {
          if (emailUser)
            throw 'There is already an account using this email address. Sign in to that account and link it with GitHub manually from Account Settings.';

          var user = db.User.build({ githubId: profileId });
          user.email = email;
          user.profile = {
            name: profile.name,
          };
          addAvatarToProfile('github', profile.avatar_url, user.profile);
          return user.save();
        });
    });
};

/**
 * Twitter
 */
repo.linkTwitterProfile = function(userId, profile) {
  return db.User.findOne({ where: { twitterId: profile.id.toString() } })
    .then(function(existingUser) {
      if (existingUser)
        throw 'There is already a Twitter account that belongs to you. Sign in with that account or delete it, then link it with your current account.';

      return db.User.findById(userId);
    })
    .then(function(user) {
      user.twitterId = profile.id.toString();
      if(!user.profile) user.profile = {};
      user.profile.name = user.profile.name || profile.name;
      addAvatarToProfile('twitter', profile.profile_image_url_https, user.profile);
      user.set('profile', user.profile);

      return user.save();
    });
};

repo.createAccFromTwitter = function(profile) {
  return db.User.findOne({ where: { twitterId: profile.id.toString() } })
    .then(function(existingUser) {
      if (existingUser)
        return existingUser;

      var user = db.User.build({ twitterId: profile.id.toString() });
      user.email = profile.screen_name + "@twitter.com";
      user.profile = {
        name: profile.displayName
      };
      addAvatarToProfile('twitter', profile.profile_image_url_https, user.profile);
      return user.save();
    });
};


/**
 * Google
 * Example Response:
 { kind: 'plus#personOpenIdConnect',
  sub: '1234567890123456789',
  name: 'Zgalowy Kategoriat',
  given_name: 'Zgalowy',
  family_name: 'Kategoriat',
  picture: 'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
  email: 'syf@puredev.eu',
  email_verified: 'true',
  locale: 'pl',
  hd: 'puredev.eu' }
 */
repo.linkGoogleProfile = function(userId, profile) {
  return db.User.findOne({ where: { googleId: profile.sub } })
    .then(function(existingUser) {
      if (existingUser)
        throw 'There is already a Google account that belongs to you. Sign in with that account or delete it, then link it with your current account.';

      return db.User.findById(userId);
    })
    .then(function(user) {
      user.googleId = profile.sub;
      if(!user.profile) user.profile = {};
      user.profile.name = user.profile.name || profile.name;
      addAvatarToProfile('google', (profile.picture.replace('sz=50', 'sz=200')), user.profile);
      user.set('profile', user.profile);

      return user.save();
    });
};

repo.createAccFromGoogle = function(profile) {
  return db.User.findOne({ where: { googleId: profile.sub } })
    .then(function(existingUser) {
      if (existingUser)
        return existingUser;

      return db.User.findOne({ where: { email: profile.email } })
        .then(function(existingEmailUser) {
          if (existingEmailUser)
            throw 'There is already an account using this email address. Sign in to that account and link it with Google manually from Account Settings.';

          var user = db.User.build({ googleId: profile.sub });
          user.email = profile.email;
          user.profile = {
            name: profile.name
          };
          addAvatarToProfile('google', (profile.picture.replace('sz=50', 'sz=200')), user.profile);
          return user.save();
        });
    });
};

/**
 * LinkedIn
 */
repo.linkLinkedInProfile = function(userId, accessToken, tokenSecret, profile) {
  return db.User.findOne({ where: { linkedInId: profile.id.toString() } })
    .then(function(existingUser) {
      if (existingUser)
        throw 'There is already a LinkedIn account that belongs to you. Sign in with that account or delete it, then link it with your current account.';

      return db.User.findById(userId);
    })
    .then(function(user) {
      user.linkedInId = profile.id.toString();
      if(!user.profile) user.profile = {};
      user.profile.name = user.profile.name || profile.displayName;
      user.profile.location = user.profile.location || (profile._json.location) ? profile._json.location.name : '';
      addAvatarToProfile('linkedin', profile._json.pictureUrl, user.profile);
      user.profile.website = user.profile.website || profile._json.publicProfileUrl;
      user.set('profile', user.profile);

      return user.save();
    });
};

repo.createAccFromLinkedIn = function(accessToken, tokenSecret, profile) {
  return db.User.findOne({ where: { linkedInId: profile.id.toString() } })
    .then(function(existingUser) {
      if (existingUser)
        return existingUser;

      return db.User.findOne({ where: { email: profile._json.emailAddress } })
        .then(function(existingEmailUser) {
          if (existingEmailUser)
            throw 'There is already an account using this email address. Sign in to that account and link it with LinkedIn manually from Account Settings.';

          var user = db.User.build({ linkedInId: profile.id.toString() });
          user.email = profile._json.emailAddress;
          user.profile = {
            name: profile.displayName,
            location: (profile._json.location) ? profile._json.location.name : '',
            website: profile._json.publicProfileUrl
          };
          addAvatarToProfile('linkedin', profile._json.pictureUrl, user.profile);
          return user.save();
        });
    });
};

module.exports = repo;