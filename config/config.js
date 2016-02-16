'use strict';

module.exports = {
  postgres: process.env.DATABASE_URL || 'postgres://USER:PASSWORD@127.0.0.1/DB',

  tokenSecret: process.env.TOKEN_SECRET || 'JWT_TOKEN_SECRET',

  // OAuth 2.0
  facebook: {
    clientId: '754220301289665',
    secret: '41860e58c256a3d7ad8267d3c1939a4a',
    url: '/api/auth/facebook'
  },
  google: {
    clientId: '828110519058.apps.googleusercontent.com',
    secret: 'JdZsIaWhUFIchmC1a_IZzOHb',
    url: '/api/auth/google'
  },
  github: {
    clientId: 'cb448b1d4f0c743a1e36',
    secret: '815aa4606f476444691c5f1c16b9c70da6714dc6',
    url: '/api/auth/github'
  },

  linkedin: {
    clientId: '77chexmowru601',
    secret: 'szdC8lN2s2SuMSy8',
    url: '/api/auth/linkedin'
  },

  instagram: {
    clientId: '9f5c39ab236a48e0aec354acb77eee9b',
    secret: '5920619aafe842128673e793a1c40028',
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
    clientId: '2STROLSFBMZLAHG3IBA141EM2HGRF0IRIBB4KXMOGA2EH3JG',
    secret: 'UAABFAWTIHIUFBL0PDC3TDMSXJF2GTGWLD3BES1QHXKAIYQB',
    authorizationEndpoint: 'https://foursquare.com/oauth2/authenticate',
    url: '/api/auth/foursquare'
  },

  // OAuth 1.0
  twitter: {
    key: '6NNBDyJ2TavL407A3lWxPFKBI',
    secret: 'ZHaYyK3DQCqv49Z9ofsYdqiUgeoICyh6uoBgFfu7OeYC7wTQKa',
    url: '/api/auth/twitter'
  }
};