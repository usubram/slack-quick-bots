/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const http = require('https');
const querystring = require('querystring');
const botLogger = require('../lib/utils/logger');

var internals = {
  retryCountStore: {},
  connectionState: false,
  options: {
    host: 'slack.com',
    path: '/api/rtm.start',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Connection': 'keep-alive',
      'agent': 'node-slack'
    },
    rejectUnauthorized: false
  },
  postData: {
    scope: 'rtm:stream',
    'simple_latest': true,
    'no_unreads': true
  }
};

module.exports.connect = function (botInfo) {
  botLogger.logger.info('Connector: trying to connect bot with token ending' +
    ' with ...', botInfo.config.botToken.substring(botInfo.config.botToken.length - 5));
  return new Promise((resolve, reject) => {
    internals.callRtm(botInfo, resolve, reject);
  });
};

internals.callRtm = function (botInfo, resolve, reject) {
  var postData = '';

  internals.postData.token = botInfo.config.botToken;
  postData = querystring.stringify(internals.postData);
  internals.options['Content-Length'] = internals.postData.length;
  internals.makeRequest(internals.options, postData).then((slackData) => {
    // reset retry counter.
    internals.retryCountStore[botInfo.config.botToken] = 0;
    botInfo.slackData = slackData;
    resolve(botInfo);

  }).catch( () => {
    internals.retryConnection(botInfo, resolve, reject);
  });
};

internals.makeRequest = function (options, postData) {
  return new Promise((resolve, reject) => {
    var req = http.request(options, function (response) {
      var responseStr = '';
      response.on('data', function (chunk) {
        responseStr += chunk;
      });
      response.on('end', function () {
        var slackData = '';
        try {
          slackData = JSON.parse(responseStr);
        } catch (err) {
          botLogger.logger.error('response', JSON.stringify(responseStr));
          botLogger.logger.error('Connector: slack response corrupted', slackData);
        }
        if (slackData && slackData.url) {
          botLogger.logger.info('Connector: got the connection string from slack');
          resolve(slackData);
        } else if (slackData && slackData.error === 'invalid_auth') {
          botLogger.logger.info('Connector: slack sent invalid auth');
          reject(slackData.error);
        } else {
          reject();
          botLogger.logger.info('Connector: calling retry');
        }
      });
    }).on('error', function () {
      reject();
    });
    req.write('' + postData);
    req.end();
  });
};

internals.retryConnection = function (botInfo, resolve, reject) {
  if (!internals.retryCountStore[botInfo.config.botToken]) {
    internals.retryCountStore[botInfo.config.botToken] = 1;
  }
  internals.retryCountStore[botInfo.config.botToken] =
    internals.retryCountStore[botInfo.config.botToken] * 2;
  /*
    Initial retry is 5 seconds and consecutive
    retry is mulitple of number of retries to allow
    enough time for network recovery or for something bad.
  */
  var timer = 1000 * internals.retryCountStore[botInfo.config.botToken];
  botLogger.logger.info('Connector: Will attempt to retry for bot token ' +
    botInfo.config.botToken.substring(botInfo.config.botToken.length - 5) + ' in ' +
    timer / 1000 + 'seconds');
  setTimeout(() => {
    botLogger.logger.info('Connector: retrying for  ' +
    botInfo.config.botToken.substring(botInfo.config.botToken.length - 5));
    internals.callRtm(botInfo, resolve, reject);
  }, timer);
};
