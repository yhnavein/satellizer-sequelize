'use strict';

var express = require('express');
var router = express.Router();
var jwt = require('jwt-simple');
var moment = require('moment');
var qs = require('querystring');
var request = require('request');
var async = require('neo-async');

var config = require('../config/config');
var authHelper = require('../helpers/authHelper');
var UserRepo = require('../repositories/UserRepository');
var UserProviderRepo = require('../repositories/UserProviderRepository');

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
      name: req.body.name
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
      if (profile.error) {
        return res.status(500).send({message: profile.error.message});
      }

      handleAuthPromise(res, UserProviderRepo.handleProviderResponse(req, 'google', profile));
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
      handleAuthPromise(res, UserProviderRepo.handleProviderResponse(req, 'github', profile));
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
    request.get({ url: graphApiUrl, qs: accessToken, json: true }, function(err1, response1, profile) {
      if (response1.statusCode !== 200) {
        return res.status(500).send({ message: profile.error.message });
      }

      handleAuthPromise(res, UserProviderRepo.handleProviderResponse(req, 'facebook', profile));
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
      request.get({ url: profileUrl + accessToken.screen_name, oauth: profileOauth, json: true }, function(err1, response1, profile) {
        handleAuthPromise(res, UserProviderRepo.handleProviderResponse(req, 'twitter', profile));
      });
    });
  }
});


/*
|--------------------------------------------------------------------------
| Login with Instagram
|--------------------------------------------------------------------------
*/
router.post('/instagram', function(req, res) {
  var accessTokenUrl = 'https://api.instagram.com/oauth/access_token';

  var params = {
    client_id: req.body.clientId,
    redirect_uri: req.body.redirectUri,
    client_secret: config.INSTAGRAM_SECRET,
    code: req.body.code,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post({ url: accessTokenUrl, form: params, json: true }, function(error, response, profile) {
    handleAuthPromise(res, UserProviderRepo.handleProviderResponse(req, 'instagram', profile));
  });
});

/*
 |--------------------------------------------------------------------------
 | Login with LinkedIn
 |--------------------------------------------------------------------------
 */
router.post('/linkedin', function(req, res) {
  var accessTokenUrl = 'https://www.linkedin.com/uas/oauth2/accessToken';
  var peopleApiUrl = 'https://api.linkedin.com/v1/people/~:(id,first-name,last-name,email-address,picture-url)';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.LINKEDIN_SECRET,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post(accessTokenUrl, { form: params, json: true }, function(err, response, body) {
    if (response.statusCode !== 200) {
      return res.status(response.statusCode).send({ message: body.error_description });
    }
    var oauthParams = {
      oauth2_access_token: body.access_token,
      format: 'json'
    };

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: peopleApiUrl, qs: oauthParams, json: true }, function(err1, response1, profile) {
      handleAuthPromise(res, UserProviderRepo.handleProviderResponse(req, 'linkedin', profile));
    });
  });
});

/*
 |--------------------------------------------------------------------------
 | Login with Yahoo
 |--------------------------------------------------------------------------
 */
router.post('/yahoo', function(req, res) {
  var accessTokenUrl = 'https://api.login.yahoo.com/oauth2/get_token';
  var clientId = req.body.clientId;
  var clientSecret = config.YAHOO_SECRET;
  var formData = {
    code: req.body.code,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };
  var headers = { Authorization: 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64') };

  // Step 1. Exchange authorization code for access token.
  request.post({ url: accessTokenUrl, form: formData, headers: headers, json: true }, function(err, response, body) {
    var socialApiUrl = 'https://social.yahooapis.com/v1/user/' + body.xoauth_yahoo_guid + '/profile?format=json';
    var oauthHeaders = { Authorization: 'Bearer ' + body.access_token };

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: socialApiUrl, headers: oauthHeaders, json: true }, function(err1, response1, profile) {
      handleAuthPromise(res, UserProviderRepo.handleProviderResponse(req, 'yahoo', profile));
    });
  });
});

/*
 |--------------------------------------------------------------------------
 | Login with Windows Live
 |--------------------------------------------------------------------------
 */
router.post('/live', function(req, res) {
  async.waterfall([
    // Step 1. Exchange authorization code for access token.
    function(done) {
      var accessTokenUrl = 'https://login.live.com/oauth20_token.srf';
      var params = {
        code: req.body.code,
        client_id: req.body.clientId,
        client_secret: config.WINDOWS_LIVE_SECRET,
        redirect_uri: req.body.redirectUri,
        grant_type: 'authorization_code'
      };
      request.post(accessTokenUrl, { form: params, json: true }, function(err, response, accessToken) {
        done(null, accessToken);
      });
    },
    // Step 2. Retrieve profile information about the current user.
    function(accessToken, done) {
      var profileUrl = 'https://apis.live.net/v5.0/me?access_token=' + accessToken.access_token;
      request.get({ url: profileUrl, json: true }, function(err, response, profile) {
        done(err, profile);
      });
    },
    function(profile) {
      handleAuthPromise(res, UserProviderRepo.handleProviderResponse(req, 'live', profile));
    }
  ]);
});

/*
 |--------------------------------------------------------------------------
 | Login with Foursquare
 |--------------------------------------------------------------------------
 */
router.post('/foursquare', function(req, res) {
  var accessTokenUrl = 'https://foursquare.com/oauth2/access_token';
  var profileUrl = 'https://api.foursquare.com/v2/users/self';
  var formData = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.FOURSQUARE_SECRET,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post({ url: accessTokenUrl, form: formData, json: true }, function(err, response, body) {
    var params = {
      v: '20140806',
      oauth_token: body.access_token
    };

    // Step 2. Retrieve information about the current user.
    request.get({ url: profileUrl, qs: params, json: true }, function(err1, response1, profile) {
      handleAuthPromise(res, UserProviderRepo.handleProviderResponse(req, 'foursquare', profile.response.user));
    });
  });
});

/*
 |--------------------------------------------------------------------------
 | Login with Twitch
 |--------------------------------------------------------------------------
 */
router.post('/twitch', function(req, res) {
  var accessTokenUrl = 'https://api.twitch.tv/kraken/oauth2/token';
  var profileUrl = 'https://api.twitch.tv/kraken/user';
  var formData = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.TWITCH_SECRET,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post({ url: accessTokenUrl, form: formData, json: true }, function(err, response, accessToken) {
   var params = {
     oauth_token: accessToken.access_token
   };

    // Step 2. Retrieve information about the current user.
    request.get({ url: profileUrl, qs: params, json: true }, function(err1, response1, profile) {
      handleAuthPromise(res, UserProviderRepo.handleProviderResponse(req, 'twitch', profile));
    });
  });
});

/*
 |--------------------------------------------------------------------------
 | Login with Bitbucket
 |--------------------------------------------------------------------------
 */
router.post('/bitbucket', function(req, res) {
  var accessTokenUrl = 'https://bitbucket.org/site/oauth2/access_token';
  var userApiUrl = 'https://bitbucket.org/api/2.0/user';
  var emailApiUrl = 'https://bitbucket.org/api/2.0/user/emails';

  var headers = {
    Authorization: 'Basic ' + new Buffer(req.body.clientId + ':' + config.BITBUCKET_SECRET).toString('base64')
  };

  var formData = {
    code: req.body.code,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post({ url: accessTokenUrl, form: formData, headers: headers, json: true }, function(err, response, body) {
    var params = {
      access_token: body.access_token
    };

    // Step 2. Retrieve information about the current user.
    request.get({ url: userApiUrl, qs: params, json: true }, function(err1, response1, profile) {

      // Step 2.5. Retrieve current user's email.
      request.get({ url: emailApiUrl, qs: params, json: true }, function(err2, response2, emails) {
        profile.email = emails.values[0].email;
        handleAuthPromise(res, UserProviderRepo.handleProviderResponse(req, 'twitch', profile));
      });
    });
  });
});


/*
 |--------------------------------------------------------------------------
 | Unlink Provider
 |--------------------------------------------------------------------------
 */
router.post('/unlink', authHelper.ensureAuthenticated, function(req, res) {
  var provider = req.body.provider;
  var providers = ['google', 'facebook', 'twitter', 'github', 'instagram', 'linkedin', 'yahoo', 'live', 'foursquare'];

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
