/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const _ = require('lodash');
const http = require('https');
const path = require('path');
const querystring = require('querystring');
const root = '..';

const botLogger = require(path.join(root, 'utils/logger'));
const Socket = require(path.join(root, 'bot/socket'));

const internals = {
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

var Connector = class {
  constructor (token, options) {
    this.options = options;
    this.connected = false;
    this.token = token;
    this.retryCountStore = {};
    this.retry = false;
    this.socket = {};
  }

  connect () {
    botLogger.logger.info('Atempting to connect bot with token ending' +
      ' with ...', this.token.substring(this.token.length - 5));
    let postData = '';
    let options = {};

    postData = querystring.stringify(_.assign(internals.postData, {
      token: this.token
    }));

    options = _.assign(internals.options, {
      'Content-Length': postData.length
    });

    return this.makeRequest(options, postData).then((slackData) => {
      return this.setupSocket(slackData);
    }).then((socket) => {
      this.connected = true;
      this.retry = false;
      this.retryCountStore = {};
      this.socket = socket;
      this.options.socketEventEmitter.emit('connect');
    }).catch((err) => {
      if (err.error === 'invalid_auth') {
        return Promise.reject(err);
      }

      this.retry = false;
      this.reconnect();
    });
  }

  reconnect () {
    if (this.retry || this.isShutdown) {
      this.isShutdown = false;
      botLogger.logger.info('Connection retry in progress...');
      return;
    }

    let tokenLastFourDigit = this.token.substring(this.token.length - 5);

    this.retry = true;
    if (!this.retryCountStore[tokenLastFourDigit]) {
      this.retryCountStore[tokenLastFourDigit] = 1;
    }
    this.retryCountStore[tokenLastFourDigit] =
      this.retryCountStore[tokenLastFourDigit] * 2;
    /*
      Initial retry is 5 seconds and consecutive
      retry is mulitple of number of retries to allow
      enough time for network recovery or for something bad.
    */
    var timer = 200 * this.retryCountStore[tokenLastFourDigit];
    botLogger.logger.info('No connection, will attempt to retry for bot token ' +
      tokenLastFourDigit + ' in ' + timer / 1000 + ' seconds');

    setTimeout(() => {
      botLogger.logger.info('Retrying to connect for  ' + tokenLastFourDigit);
      return this.connect();
    }, timer);
  }

  makeRequest (options, postData) {
    return internals.handleRequest(options, postData);
  }

  setupSocket (slackData) {
    return Promise.resolve(new Socket(slackData, {
      proxy: this.options.proxy,
      socketEventEmitter: this.options.socketEventEmitter
    }));
  }

  close () {
    this.socket.close();
  }

  shutdown () {
    this.isShutdown = true;
    this.socket.shutdown();
  }
};

internals.handleRequest = function (options, postData) {
  return Promise.resolve({
    then: (onFulfill, onReject) => {
      let req = http.request(options, function (response) {
        let responseStr = '';
        response.on('data', function (chunk) {
          responseStr += chunk;
        });
        response.on('end', function () {
          let slackData = internals.handleResponse(responseStr);
          if (slackData.error) {
            return onReject(slackData.error);
          }
          return onFulfill(slackData);
        });
      }).on('error', function (err) {
        botLogger.logger.info('Unknown error on connecting to slack ', err);
        onReject({ 'error': 'unkown_error'});
      });
      req.write('' + postData);
      req.end();
    }
  });
};

internals.handleResponse = function (responseStr) {
  let slackData = {};
  try {
    slackData = JSON.parse(responseStr);
  } catch (err) {
    botLogger.logger.debug('Slack response corrupted ', slackData);
    slackData.error = 'invalid_slack_response';
  }

  if (_.get(slackData, 'error') === 'invalid_auth') {
    botLogger.logger.info('Invalid auth token. Unable to connect');
    slackData.error = 'invalid_auth';
  } else if (_.get(slackData, 'error')) {
    botLogger.logger.info('Error connecting to slack ', _.get(slackData, 'error'));
    slackData.error = 'invalid_connection_string';
  } else if (!_.get(slackData, 'url')) {
    slackData.error = _.get(slackData, 'error');
    botLogger.logger.info('Something wrong', slackData.error);
  }

  return slackData;
};

module.exports = Connector;
