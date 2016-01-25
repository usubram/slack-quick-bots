'use strict';

// Load modules
const http = require('https');
const querystring = require('querystring');
const botLogger = require('../utils/logger');

var internals = {};
internals.retryCount = 5;
internals.retryCountStore = {};

module.exports.connect = function (botInfo) {
  botLogger.logger.info('Connector: trying to connect bot with token ending' +
    ' with ...', botInfo.config.botToken.substring(botInfo.config.botToken.length - 5));
  return new Promise((resolve, reject) => {
    this._callRtm(function (err, bot) {
      if (err) {
        reject({
          err: true,
          bot: botInfo
        });
      }
      resolve(bot);
    }, botInfo);
  });
};

module.exports._callRtm = function (callback, botInfo) {
  var postData = querystring.stringify({
    token: botInfo.config.botToken,
    scope: 'rtm:stream',
    'simple_latest': true,
    'no_unreads': true
  });
  var options = {
    host: 'slack.com',
    path: '/api/rtm.start',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Connection': 'keep-alive',
      'agent': 'node-slack',
      'Content-Length': postData.length,
    },
    rejectUnauthorized: false
  };
  var retryCaller = () => {
    this.retryConnection(callback, botInfo);
  };

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
        botLogger.logger.error('Connector: slack response corrupted', slackData.url);
      }
      if (slackData && slackData.url) {
        // reset retry counter.
        internals.retryCountStore[botInfo.config.botToken] = 0;
        botInfo.slackData = slackData;
        botLogger.logger.info('Connector: got the connection string from slack');
        callback.apply(null, [null, botInfo]);
      } else if (slackData && slackData.error === 'invalid_auth') {
        botLogger.logger.info('Connector: slack sent invalid auth');
        callback.apply(null, [true, slackData.error]);
      } else {
        botLogger.logger.info('Connector: calling retry');
        retryCaller(callback, botInfo);
      }
    });
  }).on('error', function () {
    retryCaller(callback, botInfo);
  });
  req.write('' + postData);
  req.end();
};

module.exports.retryConnection = function (callback, botInfo) {
  if (!internals.retryCountStore[botInfo.config.botToken]) {
    internals.retryCountStore[botInfo.config.botToken] = 0;
  }
  internals.retryCountStore[botInfo.config.botToken] =
    internals.retryCountStore[botInfo.config.botToken] + 1;
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
    this._callRtm(callback, botInfo);
  }, timer);
};
