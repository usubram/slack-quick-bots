/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');
var http = require('https');
var path = require('path');
var querystring = require('querystring');
var root = '..';

var botLogger = require(path.join(root, 'utils/logger'));
var Socket = require(path.join(root, 'bot/socket'));

var internals = {
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

var Connector = function () {
  function Connector(token, options) {
    _classCallCheck(this, Connector);

    this.options = options;
    this.connected = false;
    this.token = token;
    this.retryCountStore = {};
    this.retry = false;
    this.socket = {};
  }

  _createClass(Connector, [{
    key: 'connect',
    value: function connect() {
      var _this = this;

      botLogger.logger.info('Connector: trying to connect bot with token ending' + ' with ...', this.token.substring(this.token.length - 5));
      var postData = '';
      var options = {};

      postData = querystring.stringify(_.assign(internals.postData, {
        token: this.token
      }));

      options = _.assign(internals.options, {
        'Content-Length': postData.length
      });

      return this.makeRequest(options, postData).then(function (slackData) {
        return _this.setupSocket(slackData);
      }).then(function (socket) {
        _this.connected = true;
        _this.retry = false;
        _this.retryCountStore = {};
        _this.socket = socket;
        _this.options.socketEventEmitter.emit('connect');
      }).catch(function (err) {
        if (err.error === 'invalid_auth') {
          return Promise.reject(err);
        }

        _this.retry = false;
        _this.reconnect();
      });
    }
  }, {
    key: 'reconnect',
    value: function reconnect() {
      var _this2 = this;

      if (this.retry || this.isShutdown) {
        this.isShutdown = false;
        botLogger.logger.info('Connector: Retry in already progress...');
        return;
      }

      var tokenLastFourDigit = this.token.substring(this.token.length - 5);

      this.retry = true;
      if (!this.retryCountStore[tokenLastFourDigit]) {
        this.retryCountStore[tokenLastFourDigit] = 1;
      }
      this.retryCountStore[tokenLastFourDigit] = this.retryCountStore[tokenLastFourDigit] * 2;
      /*
        Initial retry is 5 seconds and consecutive
        retry is mulitple of number of retries to allow
        enough time for network recovery or for something bad.
      */
      var timer = 1000 * this.retryCountStore[tokenLastFourDigit];
      botLogger.logger.info('Connector: Will attempt to retry for bot token ' + tokenLastFourDigit + ' in ' + timer / 1000 + ' seconds');

      setTimeout(function () {
        botLogger.logger.info('Connector: retrying for  ' + tokenLastFourDigit);
        return _this2.connect();
      }, timer);
    }
  }, {
    key: 'makeRequest',
    value: function makeRequest(options, postData) {
      return internals.handleRequest(options, postData);
    }
  }, {
    key: 'setupSocket',
    value: function setupSocket(slackData) {
      return Promise.resolve(new Socket(slackData, {
        socketEventEmitter: this.options.socketEventEmitter
      }));
    }
  }, {
    key: 'close',
    value: function close() {
      this.socket.close();
    }
  }, {
    key: 'shutdown',
    value: function shutdown() {
      this.isShutdown = true;
      this.socket.shutdown();
    }
  }]);

  return Connector;
}();

internals.handleRequest = function (options, postData) {
  return Promise.resolve({
    then: function then(onFulfill, onReject) {
      var req = http.request(options, function (response) {
        var responseStr = '';
        response.on('data', function (chunk) {
          responseStr += chunk;
        });
        response.on('end', function () {
          var slackData = internals.handleResponse(responseStr);
          if (slackData.error) {
            return onReject(slackData.error);
          }
          return onFulfill(slackData);
        });
      }).on('error', function (err) {
        botLogger.logger.info('Connector: unknown error', err);
        onReject({ 'error': 'unkown_error' });
      });
      req.write('' + postData);
      req.end();
    }
  });
};

internals.handleResponse = function (responseStr) {
  var slackData = {};
  try {
    slackData = JSON.parse(responseStr);
  } catch (err) {
    botLogger.logger.error('response', JSON.stringify(responseStr));
    botLogger.logger.error('Connector: slack response corrupted', slackData);
    slackData.error = 'invalid_slack_response';
  }

  if (_.get(slackData, 'error') === 'invalid_auth') {
    botLogger.logger.info('Connector: slack sent invalid auth');
    slackData.error = 'invalid_auth';
  } else if (_.get(slackData, 'error')) {
    botLogger.logger.info('Connector: got the connection string from slack');
    slackData.error = 'invalid_connection_string';
  } else if (!_.get(slackData, 'url')) {
    botLogger.logger.info('Connector: calling retry');
    slackData.error = _.get(slackData, 'error');
  }
  return slackData;
};

module.exports = Connector;