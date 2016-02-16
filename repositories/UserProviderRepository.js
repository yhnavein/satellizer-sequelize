'use strict';

var db = require('../models/sequelize');
var config = require('../config/config');
var jwt = require('jwt-simple');
var Promise = require('bluebird');

var repo = {};

function getJwtFromRequest(req) {
  if(!req.headers.authorization)
    return null;

  var token = req.headers.authorization.split(' ')[1];
  return jwt.decode(token, config.tokenSecret);
}

repo.handleProviderResponse = function(req, providerName, profile) {
  var payload = getJwtFromRequest(req);
  var providerRepo = repo[providerName];

  if (req.headers.authorization)
    return providerRepo.linkProfile(payload.sub, profile);

  return providerRepo.createProfile(profile);
};

/**
 * Facebook
 */
repo.facebook = {
  linkProfile: function(userId, profile) {
    var profileId = profile.id;

    return db.User.findOne({ where: { facebookId: profileId } })
      .then(function(existingUser) {
        if (existingUser)
          return Promise.reject('There is already a Facebook account that belongs to you. Sign in with that account or delete it, then link it with your current account.');

        return db.User.findById(userId);
      })
      .then(function(user) {
        user.facebookId = profileId;
        user.name = user.name || profile.name;
        user.avatarUrl = 'https://graph.facebook.com/' + profileId + '/picture?type=large';

        return user.save();
      });
  },
  createProfile: function(profile) {
    var profileId = profile.id;

    return db.User.findOne({ where: { facebookId: profileId } })
      .then(function(existingUser) {
        if (existingUser)
          return existingUser;

        return db.User.findOne({ where: { email: profile.email } })
          .then(function(emailUser) {
            if (emailUser)
              return Promise.reject('There is already an account using this email address. Sign in to that account and link it with Facebook manually from Account Settings.');

            var user = db.User.build({ facebookId: profileId });
            user.email = profile.email || ( profileId + '@facebook.com' );
            user.name = profile.name;
            user.avatarUrl = 'https://graph.facebook.com/' + profileId + '/picture?type=large';
            return user.save();
          });
      });
  }
};


/**
 * GitHub
 */
repo.github = {
  linkProfile: function(userId, profile) {
    var profileId = profile.id.toString();

    return db.User.findOne({ where: { githubId: profileId } })
      .then(function(existingUser) {
        if (existingUser)
          return Promise.reject('There is already a GitHub account that belongs to you. Sign in with that account or delete it, then link it with your current account.');

        return db.User.findById(userId);
      })
      .then(function(user) {
        user.githubId = profileId;
        user.name = user.name || profile.displayName;
        user.avatarUrl = profile.avatar_url;

        return user.save();
      });
  },

  createProfile: function(profile) {
    var profileId = profile.id.toString();
    var email = (profile.login || profile.id) + '@github.com';

    return db.User.findOne({ where: { githubId: profileId } })
      .then(function(existingUser) {
        if (existingUser)
          return existingUser;

        return db.User.findOne({ where: { email: email } })
          .then(function(emailUser) {
            if (emailUser)
              return Promise.reject('There is already an account using this email address. Sign in to that account and link it with GitHub manually from Account Settings.');

            var user = db.User.build({ githubId: profileId });
            user.email = email;
            user.name = profile.name;
            user.avatarUrl = profile.avatar_url;
            return user.save();
          });
      });
  }
};

/**
 * Twitter
 */
repo.twitter = {
  linkProfile: function(userId, profile) {
    return db.User.findOne({ where: { twitterId: profile.id.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return Promise.reject('There is already a Twitter account that belongs to you. Sign in with that account or delete it, then link it with your current account.');

        return db.User.findById(userId);
      })
      .then(function(user) {
        user.twitterId = profile.id.toString();
        user.name = user.name || profile.name;
        user.avatarUrl = profile.profile_image_url_https;

        return user.save();
      });
  },
  createProfile: function(profile) {
    return db.User.findOne({ where: { twitterId: profile.id.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return existingUser;

        var user = db.User.build({ twitterId: profile.id.toString() });
        user.email = profile.screen_name + "@twitter.com";
        user.name = profile.displayName;
        user.avatarUrl = profile.profile_image_url_https;
        return user.save();
      });
  }
};

/**
 * Google
 */
repo.google = {
  linkProfile: function(userId, profile) {
    return db.User.findOne({ where: { googleId: profile.sub } })
      .then(function(existingUser) {
        if (existingUser)
          return Promise.reject('There is already a Google account that belongs to you. Sign in with that account or delete it, then link it with your current account.');

        return db.User.findById(userId);
      })
      .then(function(user) {
        user.googleId = profile.sub;
        user.name = user.name || profile.name;
        user.avatarUrl = profile.picture.replace('sz=50', 'sz=200');

        return user.save();
      });
  },
  createProfile: function(profile) {
    return db.User.findOne({ where: { googleId: profile.sub } })
      .then(function(existingUser) {
        if (existingUser)
          return existingUser;

        return db.User.findOne({ where: { email: profile.email } })
          .then(function(existingEmailUser) {
            if (existingEmailUser)
              return Promise.reject('There is already an account using this email address. Sign in to that account and link it with Google manually from Account Settings.');

            var user = db.User.build({ googleId: profile.sub });
            user.email = profile.email;
            user.name = profile.name;
            user.avatarUrl = profile.picture.replace('sz=50', 'sz=200');
            return user.save();
          });
      });
  }
};

/**
 * LinkedIn
 */
repo.linkedin = {
  linkProfile: function(userId, profile) {
    return db.User.findOne({ where: { linkedinId: profile.id.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return Promise.reject('There is already a LinkedIn account that belongs to you. Sign in with that account or delete it, then link it with your current account.');

        return db.User.findById(userId);
      })
      .then(function(user) {
        user.linkedinId = profile.id.toString();
        user.name = user.name || profile.firstName + ' ' + profile.lastName;
        user.avatarUrl = profile.pictureUrl;

        return user.save();
      });
  },
  createProfile: function(profile) {
    return db.User.findOne({ where: { linkedinId: profile.id.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return existingUser;

        return db.User.findOne({ where: { email: profile.emailAddress } })
          .then(function(existingEmailUser) {
            if (existingEmailUser)
              return Promise.reject('There is already an account using this email address. Sign in to that account and link it with LinkedIn manually from Account Settings.');

            var user = db.User.build({ linkedinId: profile.id.toString() });
            user.email = profile.emailAddress;
            user.name = profile.firstName + ' ' + profile.lastName;
            user.avatarUrl = profile.pictureUrl;
            return user.save();
          });
      });
  }
};

/**
 * Instagram
 */
repo.instagram = {
  linkProfile: function(userId, profile) {
    return db.User.findOne({ where: { instagramId: profile.user.id.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return Promise.reject('There is already an Instagram account that belongs to you. Sign in with that account or delete it, then link it with your current account.');

        return db.User.findById(userId);
      })
      .then(function(user) {
        user.instagramId = profile.user.id.toString();
        user.name = user.name || profile.user.username;
        user.avatarUrl = profile.user.profile_picture;

        return user.save();
      });
  },
  createProfile: function(profile) {
    return db.User.findOne({ where: { instagramId: profile.user.id.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return existingUser;

        var user = db.User.build({ instagramId: profile.user.id.toString() });
        user.email = profile.user.username + '@instagram.com';
        user.name = profile.user.username;
        user.avatarUrl = profile.user.profile_picture;
        return user.save();
      });
  }
};

/**
 * Yahoo
 */
repo.yahoo = {
  linkProfile: function(userId, body) {
    return db.User.findOne({ where: { yahooId: body.profile.guid.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return Promise.reject('There is already a Yahoo account that belongs to you. Sign in with that account or delete it, then link it with your current account.');

        return db.User.findById(userId);
      })
      .then(function(user) {
        user.yahooId = body.profile.guid.toString();
        user.name = user.name || body.profile.nickname;

        return user.save();
      });
  },
  createProfile: function(body) {
    return db.User.findOne({ where: { yahooId: body.profile.guid.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return existingUser;

        var user = db.User.build({ yahooId: body.profile.guid.toString() });
        user.email = body.profile.nickname + '@yahoo.com';
        user.name = body.profile.nickname;
        return user.save();
      });
  }
};

/**
 * Windows Live
 */
repo.live = {
  linkProfile: function(userId, profile) {
    return db.User.findOne({ where: { liveId: profile.id.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return Promise.reject('There is already an Windows Live account that belongs to you. Sign in with that account or delete it, then link it with your current account.');

        return db.User.findById(userId);
      })
      .then(function(user) {
        user.liveId = profile.id.toString();
        user.name = user.name || profile.name;

        return user.save();
      });
  },
  createProfile: function(profile) {
    return db.User.findOne({ where: { liveId: profile.id.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return existingUser;

        var user = db.User.build({ liveId: profile.id.toString() });
        user.email = profile.name + '@live.com';
        user.name = profile.name;
        return user.save();
      });
  }
};

/**
 * Foursquare
 */
repo.foursquare = {
  linkProfile: function(userId, profile) {
    return db.User.findOne({ where: { foursquareId: profile.id.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return Promise.reject('There is already a Foursquare account that belongs to you. Sign in with that account or delete it, then link it with your current account.');

        return db.User.findById(userId);
      })
      .then(function(user) {
        user.foursquareId = profile.id.toString();
        user.name = user.name || profile.firstName + ' ' + profile.lastName;
        user.avatarUrl = profile.photo.prefix + '300x300' + profile.photo.suffix;

        return user.save();
      });
  },
  createProfile: function(profile) {
    return db.User.findOne({ where: { foursquareId: profile.id.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return existingUser;

        var user = db.User.build({ foursquareId: profile.id.toString() });
        user.email = profile.emailAddress;
        user.name = profile.firstName + ' ' + profile.lastName;
        user.avatarUrl = profile.photo.prefix + '300x300' + profile.photo.suffix;
        return user.save();
      });
  }
};

/**
 * Twitch
 */
repo.twitch = {
  linkProfile: function(userId, profile) {
    return db.User.findOne({ where: { twitchId: profile._id.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return Promise.reject('There is already a Twitch account that belongs to you. Sign in with that account or delete it, then link it with your current account.');

        return db.User.findById(userId);
      })
      .then(function(user) {
        user.twitchId = profile._id.toString();
        user.name = user.name || profile.name;
        user.avatarUrl = profile.logo || user.avatarUrl;

        return user.save();
      });
  },
  createProfile: function(profile) {
    return db.User.findOne({ where: { twitchId: profile._id.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return existingUser;

        return db.User.findOne({ where: { email: profile.email } })
          .then(function(existingEmailUser) {
            if (existingEmailUser)
              return Promise.reject('There is already an account using this email address. Sign in to that account and link it with Twitch manually from Account Settings.');

            var user = db.User.build({ twitchId: profile._id.toString() });
            user.email = profile.email;
            user.name = profile.name;
            user.avatarUrl = profile.logo;
            return user.save();
          });
      });
  }
};

/**
 * BitBucket
 */
repo.bitbucket = {
  linkProfile: function(userId, profile) {
    return db.User.findOne({ where: { bitbucketId: profile.uuid.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return Promise.reject('There is already a BitBucket account that belongs to you. Sign in with that account or delete it, then link it with your current account.');

        return db.User.findById(userId);
      })
      .then(function(user) {
        user.bitbucketId = profile.uuid.toString();
        user.name = user.name || profile.display_name;
        user.avatarUrl = profile.links.avatar.href || user.avatarUrl;

        return user.save();
      });
  },
  createProfile: function(profile) {
    return db.User.findOne({ where: { bitbucketId: profile.uuid.toString() } })
      .then(function(existingUser) {
        if (existingUser)
          return existingUser;

        return db.User.findOne({ where: { email: profile.email } })
          .then(function(existingEmailUser) {
            if (existingEmailUser)
              return Promise.reject('There is already an account using this email address. Sign in to that account and link it with BitBucket manually from Account Settings.');

            var user = db.User.build({ bitbucketId: profile.uuid.toString() });
            user.email = profile.email;
            user.name = profile.display_name;
            user.avatarUrl = profile.links.avatar.href;
            return user.save();
          });
      });
  }
};
