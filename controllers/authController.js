'use strict';

var express = require('express');
var router = express.Router();
var jwt = require('jwt-simple');
var moment = require('moment');
var qs = require('querystring');
var request = require('request');

var config = require('../config/config');
var authHelper = require('../helpers/authHelper');
var UserRepo = require('../repositories/UserRepository');

var TOKEN_VALIDITY_DAYS = 30;

var _clientSettings = {
  facebook: {
    clientId: config.facebook.clientId,
    url: config.facebook.url
  },
  google: {
    clientId: config.google.clientId,
    url: config.google.url
  },
  github: {
    clientId: config.github.clientId,
    url: config.github.url
  },
  twitter: {
    url: config.twitter.url
  },
  linkedin: {
    clientId: config.linkedin.clientId,
    url: config.linkedin.url
  },
  instagram: {
    clientId: config.instagram.clientId,
    url: config.instagram.url
  },
  yahoo: {
    clientId: config.yahoo.clientId,
    url: config.yahoo.url
  },
  live: {
    clientId: config.live.clientId,
    url: config.live.url
  },
  twitch: {
    clientId: config.twitch.clientId,
    url: config.twitch.url
  },
  bitbucket: {
    clientId: config.bitbucket.clientId,
    url: config.bitbucket.url
  },
  foursquare: {
    clientId: config.foursquare.clientId,
    url: config.foursquare.url
  }
};

/*
 |--------------------------------------------------------------------------
 | Generate JSON Web Token
 |--------------------------------------------------------------------------
 */
function createJWT(user) {
  var payload = {
    sub: user.id,
    iat: moment().unix(),
    exp: moment().add(TOKEN_VALIDITY_DAYS, 'days').unix()
  };

  return {
    token: jwt.encode(payload, config.tokenSecret)
  };
}

function getJwtFromRequest(req) {
  if(!req.headers.authorization)
    return null;

  var token = req.headers.authorization.split(' ')[1];
  return jwt.decode(token, config.tokenSecret);
}


router.get('/settings', function(req, res) {
  res.send(_clientSettings);
});

/*
 |--------------------------------------------------------------------------
 | Log in with Email
 |--------------------------------------------------------------------------
 */
router.post('/login', function(req, res) {
  UserRepo.logInUser(req.body.email, req.body.password, function(err, user) {
    if(!user) {
      console.log('Login error: ', err);
      return res.status(401).send({ message: 'Invalid email and/or password' });
    }
    res.send(createJWT(user));
  });
});

/*
 |--------------------------------------------------------------------------
 | Create Email and Password Account
 |--------------------------------------------------------------------------
 */
router.post('/signup', function(req, res) {
  UserRepo.createUser({
      email: req.body.email,
      password: req.body.password,
      //req.body.displayName
    })
    .then(function(user) {
      res.send(createJWT(user));
    })
    .catch(function(err) {
      console.log('Error occured', err);
      res.status(500).send({ message: 'Error occured' });
    });
});

function handleAuthPromise(res, promise) {
  promise
    .then(function(user) {
      res.send(createJWT(user));
    })
    .catch(function(cerr) {
      return res.status(409).send({ message: cerr });
    });
}

/*
 |--------------------------------------------------------------------------
 | Login with Google
 |--------------------------------------------------------------------------
 */
router.post('/google', function(req, res) {
  var accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
  var peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.google.secret,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post(accessTokenUrl, { json: true, form: params }, function(err, response, token) {
    var accessToken = token.access_token;
    var headers = { Authorization: 'Bearer ' + accessToken };

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: peopleApiUrl, headers: headers, json: true }, function(err1, response1, profile) {
      console.log(profile);

      if (profile.error) {
        return res.status(500).send({message: profile.error.message});
      }

      var payload = getJwtFromRequest(req);
      var promise = (req.headers.authorization ?
        UserRepo.linkGoogleProfile(payload.sub, profile) :
        UserRepo.createAccFromGoogle(profile));

      handleAuthPromise(res, promise);
    });
  });
});

/*
 |--------------------------------------------------------------------------
 | Login with GitHub
 |--------------------------------------------------------------------------
 */
router.post('/github', function(req, res) {
  var accessTokenUrl = 'https://github.com/login/oauth/access_token';
  var userApiUrl = 'https://api.github.com/user';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.github.secret,
    redirect_uri: req.body.redirectUri
  };

  // Step 1. Exchange authorization code for access token.
  request.get({ url: accessTokenUrl, qs: params }, function(err, response, accessToken) {
    accessToken = qs.parse(accessToken);
    var headers = { 'User-Agent': 'Satellizer' };

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: userApiUrl, qs: accessToken, headers: headers, json: true }, function(err, response, profile) {
      var payload = getJwtFromRequest(req);

      var promise = (req.headers.authorization ?
        UserRepo.linkGithubProfile(payload.sub, profile) :
        UserRepo.createAccFromGithub(profile));

      handleAuthPromise(res, promise);
    });
  });
});

/*
 |--------------------------------------------------------------------------
 | Login with Facebook
 |--------------------------------------------------------------------------
 */
router.post('/facebook', function(req, res) {
  var fields = ['id', 'email', 'first_name', 'last_name', 'link', 'name'];
  var accessTokenUrl = 'https://graph.facebook.com/v2.5/oauth/access_token';
  var graphApiUrl = 'https://graph.facebook.com/v2.5/me?fields=' + fields.join(',');
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.facebook.secret,
    redirect_uri: req.body.redirectUri
  };

  // Step 1. Exchange authorization code for access token.
  request.get({ url: accessTokenUrl, qs: params, json: true }, function(err, response, accessToken) {
    if (response.statusCode !== 200) {
      return res.status(500).send({ message: accessToken.error.message });
    }

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: graphApiUrl, qs: accessToken, json: true }, function(err, response, profile) {
      if (response.statusCode !== 200) {
        return res.status(500).send({ message: profile.error.message });
      }

      var payload = getJwtFromRequest(req);
      var promise = (req.headers.authorization ?
        UserRepo.linkFacebookProfile(payload.sub, profile) :
        UserRepo.createAccFromFacebook(profile));

      handleAuthPromise(res, promise);
    });
  });
});

/*
 |--------------------------------------------------------------------------
 | Login with Twitter
 |--------------------------------------------------------------------------
 */
router.post('/twitter', function(req, res) {
  var requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
  var accessTokenUrl = 'https://api.twitter.com/oauth/access_token';
  var profileUrl = 'https://api.twitter.com/1.1/users/show.json?screen_name=';

  // Part 1 of 2: Initial request from Satellizer.
  if (!req.body.oauth_token || !req.body.oauth_verifier) {
    var requestTokenOauth = {
      consumer_key: config.twitter.key,
      consumer_secret: config.twitter.secret,
      callback: req.body.redirectUri
    };

    // Step 1. Obtain request token for the authorization popup.
    request.post({ url: requestTokenUrl, oauth: requestTokenOauth }, function(err, response, body) {
      var oauthToken = qs.parse(body);

      // Step 2. Send OAuth token back to open the authorization screen.
      res.send(oauthToken);
    });
  } else {
    // Part 2 of 2: Second request after Authorize app is clicked.
    var accessTokenOauth = {
      consumer_key: config.twitter.key,
      consumer_secret: config.twitter.secret,
      token: req.body.oauth_token,
      verifier: req.body.oauth_verifier
    };

    // Step 3. Exchange oauth token and oauth verifier for access token.
    request.post({ url: accessTokenUrl, oauth: accessTokenOauth }, function(err, response, accessToken) {
      accessToken = qs.parse(accessToken);

      var profileOauth = {
        consumer_key: config.twitter.key,
        consumer_secret: config.twitter.secret,
        oauth_token: accessToken.oauth_token
      };

      // Step 4. Retrieve profile information about the current user.
      request.get({
        url: profileUrl + accessToken.screen_name,
        oauth: profileOauth,
        json: true
      }, function(err, response, profile) {
          var payload = getJwtFromRequest(req);
          var promise = (req.headers.authorization ?
            UserRepo.linkGithubProfile(payload.sub, profile) :
            UserRepo.createAccFromGithub(profile));

          handleAuthPromise(res, promise);
      });
    });
  }
});


/*
 |--------------------------------------------------------------------------
 | Unlink Provider
 |--------------------------------------------------------------------------
 */
router.post('/unlink', authHelper.ensureAuthenticated, function(req, res) {
  var provider = req.body.provider;
  var providers = ['facebook', 'google', 'github', 'twitter'];

  if (providers.indexOf(provider) === -1) {
    return res.status(400).send({ message: 'Unknown OAuth Provider' });
  }

  UserRepo.unlinkProviderFromAccount(provider, req.user)
    .then(function() { res.status(200).end(); })
    .catch(function(err) {
      console.log(err);
      return res.status(400).send({ message: 'User Not Found' });
    });
});

module.exports = router;
