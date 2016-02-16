'use strict';

module.exports = {
  postgres: process.env.DATABASE_URL || 'postgres://USER:PASSWORD@127.0.0.1/DB',

  tokenSecret: process.env.TOKEN_SECRET || 'JWT_TOKEN_SECRET',

  // OAuth 2.0
  facebook: {
    clientId: '657854390977827',
    secret: 'FACEBOOK_SECRET',
    url: '/api/auth/facebook'
  },
  google: {
    clientId: '631036554609-v5hm2amv4pvico3asfi97f54sc51ji4o.apps.googleusercontent.com',
    secret: 'GOOGLE_SECRET',
    url: '/api/auth/google'
  },
  github: {
    clientId: '0ba2600b1dbdb756688b',
    secret: 'GITHUB_SECRET',
    url: '/api/auth/github'
  },

  linkedin: {
    clientId: '77cw786yignpzj',
    secret: 'LINKEDIN_SECRET',
    url: '/api/auth/linkedin'
  },

  instagram: {
    clientId: '799d1f8ea0e44ac8b70e7f18fcacedd1',
    secret: 'INSTAGRAM_SECRET',
    url: '/api/auth/instagram'
  },

  yahoo: {
    clientId: 'dj0yJmk9SDVkM2RhNWJSc2ZBJmQ9WVdrOWIzVlFRMWxzTXpZbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD0yYw--',
    secret: 'YAHOO_SECRET',
    url: '/api/auth/yahoo'
  },

  live: {
    clientId: '000000004C12E68D',
    secret: 'LIVE_SECRET',
    url: '/api/auth/live'
  },

  twitch: {
    clientId: 'qhc3lft06xipnmndydcr3wau939a20z',
    secret: 'TWITCH_SECRET',
    url: '/api/auth/twitch'
  },

  bitbucket: {
    clientId: '48UepjQDYaZFuMWaDj',
    secret: 'BITBUCKET_SECRET',
    url: '/api/auth/bitbucket'
  },

  foursquare: {
    clientId: 'MTCEJ3NGW2PNNB31WOSBFDSAD4MTHYVAZ1UKIULXZ2CVFC2K',
    secret: 'FOURSQUARE_SECRET',
    authorizationEndpoint: 'https://foursquare.com/oauth2/authenticate',
    url: '/api/auth/foursquare'
  },

  // OAuth 1.0
  twitter: {
    key: 'YOUR_TWITTER_CONSUMER_KEY',
    secret: 'TWITTER_SECRET',
    url: '/api/auth/twitter'
  }
};