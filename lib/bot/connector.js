/**
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2018 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

const _ = require('lodash');
const http = require('https');
const path = require('path');
const querystring = require('querystring');

const root = '..';

const logger = require(path.join(root, 'utils/logger'));
const Socket = require(path.join(root, 'bot/socket'));

const internals = {
  options: {
    host: 'slack.com',
    path: '/api/rtm.connect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Connection': 'keep-alive',
      'agent': 'node-slack',
    },
    rejectUnauthorized: false,
  },
  postData: {
    'scope': 'rtm:stream',
    'simple_latest': true,
    'no_unreads': true,
  },
};

/**
*
* Class to handle connection and reconnection.
*
*/
const Connector = class {
  /**
  * Creates a new Connector instance.
  * @param {string} token Bot token.
  * @param {object} options Connection options.
  * @param {function} options.httpAgent http proxy agent.
  * @param {function} options.socketAgent socket proxy agent.
  * @param {object} options.socketEventEmitter event emitter.
  * @class
  */
  constructor (token, options) {
    this.options = options;
    this.connected = false;
    this.token = token;
    this.retryCountStore = {};
    this.retry = false;
    this.socket = new Socket({
      agent: this.options.socketAgent,
      socketEventEmitter: this.options.socketEventEmitter,
    });
  }

  /**
  * Function to connect to slack rtm api.
  *
  * @return {object} Promise resolves to success or failure.
  */
  connect () {
    logger.info('Attempting to connect bot with token ending' +
      ' with ...', this.token.substring(this.token.length - 5));
    let postData = '';
    let options = {};

    postData = querystring.stringify(_.assign(internals.postData, {
      token: this.token,
    }));

    options = _.assign(internals.options, {
      'Content-Length': postData.length,
    });

    if (this.options.httpAgent) {
      options.agent = this.options.httpAgent;
    }

    return this.makeRequest(options, postData).then((slackData) => {
      return this.setupSocket(slackData);
    }).then(() => {
      this.connected = true;
      this.retry = false;
      this.retryCountStore = {};
      this.options.socketEventEmitter.emit('connect');
    }).catch((err) => {
      if (err === 'invalid_auth') {
        return Promise.reject(err);
      }

      this.retry = false;
      this.reconnect();
    });
  }

  /**
  * Function to reconnect to slack rtm api.
  */
  reconnect () {
    if (this.retry || this.isShutdown) {
      this.isShutdown = false;
      logger.info('Connection retry in progress...');
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
    const timer = 200 * this.retryCountStore[tokenLastFourDigit];

    logger.info('No connection, will attempt to retry for bot token ' +
      tokenLastFourDigit + ' in ' + timer / 1000 + ' seconds');

    setTimeout(() => {
      logger.info('Retrying to connect for  ' + tokenLastFourDigit);
      return this.connect();
    }, timer);
  }

  /**
  * Function to make slack rtm request.
  * @param {object} options http request options.
  * @param {object} postData http request post data.
  *
  * @return {object} Promise resolves to success or failure.
  */
  makeRequest (options, postData) {
    return internals.handleRequest(options, postData);
  }

  /**
  * Function to setup socket connection to slack.
  * @param {object} slackData slack data.
  *
  * @return {object} Promise resolves to success or failure.
  */
  setupSocket (slackData) {
    return Promise.resolve(this.socket.setupSocketConnectionEvents(slackData));
  }

  /**
  * Function to close socket connection to slack.
  */
  close () {
    this.socket.close();
  }

  /**
  * Function to shutdown socket connection to slack.
  */
  shutdown () {
    this.isShutdown = true;
    this.socket.shutdown();
  }
};

/**
* Function to make slack rtm request.
* @param {object} options http request options.
* @param {object} postData http request post data.
*
* @return {object} Promise resolves to success or failure.
*/
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
        logger.info('Unknown error on connecting to slack ', err);
        onReject({
          'error': 'unkown_error',
        });
      });

      req.write('' + postData);
      req.end();
    },
  });
};

/**
* Function to handle slack rtm response.
* @param {object} responseStr slack rtm response.
*
* @return {object} Promise resolves to slackData.
*/
internals.handleResponse = function (responseStr) {
  let slackData = {};

  try {
    slackData = JSON.parse(responseStr);
  } catch (err) {
    logger.error('Slack response corrupted ', slackData);
    slackData.error = 'invalid_slack_response';
  }

  if (_.get(slackData, 'error') === 'invalid_auth') {
    logger.info('Invalid auth token. Unable to connect');
    slackData.error = 'invalid_auth';
  } else if (_.get(slackData, 'error')) {
    logger.info('Error connecting to slack ', _.get(slackData, 'error'));
    slackData.error = 'invalid_connection_string';
  } else if (!_.get(slackData, 'url')) {
    slackData.error = _.get(slackData, 'error');
    logger.info('Something wrong', slackData.error);
  }

  return slackData;
};

module.exports = Connector;
