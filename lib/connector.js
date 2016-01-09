'use strict';

// Load modules
const http = require('https');
const querystring = require('querystring');

const internals = {};
internals.retryCount = 10;
internals.retryCountStore = 0;

module.exports.connect = function(botInfo) {
  var retryCaller = () => {
    this.retryConnection(botInfo);
  };
  return new Promise(function(resolve) {
    var postData = querystring.stringify({
      'token' : botInfo.bot.botToken,
      'scope': 'rtm:stream',
      'simple_latest': true,
      'no_unreads': true
    });
    var options = {
      host: 'slack.com',
      path: '/api/rtm.start',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Connection':'keep-alive',
        'agent': 'node-slack',
        'Content-Length': postData.length,
      },
      rejectUnauthorized: false
    };

    var req = http.request(options, function(response) {
      var str = '';
      response.on('data', function (chunk) {
        str += chunk;
      });
      response.on('end', function () {
        if (str) {
          var slackData = JSON.parse(str);
          if (slackData && slackData.url) {
            // reset retry counter.
            internals.retryCountStore = internals.retryCount;
            botInfo.slackData = JSON.parse(str);
            resolve(botInfo);
          } else {
            retryCaller();
          }
        }
      });
    }).on('connect', function() {
      console.log('connected..');
    }).on('error', function() {
      retryCaller();
    });
    req.write('' + postData);
    req.end();
  });
};

module.exports.retryConnection = function(botInfo) {
  if (internals.retryCountStore !== internals.retryCount) {
    internals.retryCountStore++;
    /*
      Initial retry is 5 seconds and consecutive 
      retry is mulitple of number of retries to allow
      enough time for network recovery or for something bad.
    */
    var timer = 1000 * internals.retryCountStore;
    setTimeout(() => {
      this.connect(botInfo);
    }, timer);
  }
};
