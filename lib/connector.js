'use strict';

// Load modules
const http = require('https');
const querystring = require('querystring');

var internals = {};
internals.retryCount = 5;
internals.retryCountStore = {};

module.exports.connect = function (botInfo) {
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
    token: botInfo.bot.botToken,
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
        console.log(err);
      }
      if (slackData && slackData.url) {
        // reset retry counter.
        internals.retryCountStore[botInfo.bot.botToken] = 0;
        botInfo.slackData = slackData;
        callback.apply(null, [null, botInfo]);
      } else if (slackData && slackData.error === 'invalid_auth') {
        callback.apply(null, [true, slackData.error]);
      } else {
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
  if (!internals.retryCountStore[botInfo.bot.botToken]) {
    internals.retryCountStore[botInfo.bot.botToken] = 0;
  }
  if (internals.retryCountStore[botInfo.bot.botToken] <= internals.retryCount) {
    internals.retryCountStore[botInfo.bot.botToken] =
      internals.retryCountStore[botInfo.bot.botToken] + 1;
    /*
      Initial retry is 5 seconds and consecutive 
      retry is mulitple of number of retries to allow
      enough time for network recovery or for something bad.
    */
    var timer = 1000 * internals.retryCountStore[botInfo.bot.botToken];
    setTimeout(() => {
      this._callRtm(callback, botInfo);
    }, timer);
  } else {
    callback.apply(null, [true, 'check bot token']);
  }
};
