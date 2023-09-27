'use strict';

import { request } from 'https';
import { stringify } from 'querystring';
import { getUserInfo } from '../slack-api/users.js';

import logger from '../utils/logger.js';

import { Socket } from './socket.js';
import * as lodash from 'lodash-es';

const { assign, get } = lodash;

const CONFIG = {
  options: {
    host: 'slack.com',
    path: '/api/rtm.connect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Connection: 'keep-alive',
      agent: 'node-slack',
    },
    rejectUnauthorized: false,
  },
  postData: {
    scope: 'rtm:stream',
    simple_latest: true,
    no_unreads: true,
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
  constructor(token, options) {
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
  connect() {
    logger.info(
      'Attempting to connect bot with token ending' + ' with ...',
      this.token.substring(this.token.length - 5)
    );
    let postData = '';
    let options = {};

    postData = stringify(
      assign(CONFIG.postData, {
        token: this.token,
      })
    );

    options = assign(CONFIG.options, {
      'Content-Length': postData.length,
    });

    if (this.options.httpAgent) {
      options.agent = this.options.httpAgent;
    }

    return this.makeRequest(options, postData)
      .then((slackData) => {
        return this.setupSocket(slackData).then(() => slackData);
      })
      .then(() => {
        this.connected = true;
        this.retry = false;
        this.retryCountStore = {};
        this.options.socketEventEmitter.emit('connect');
      })
      .catch((err) => {
        logger.error('Socket connection went bad', err);
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
  reconnect() {
    if (this.retry || this.isShutdown) {
      this.isShutdown = false;
      logger.info('Connection retry in progress...');
      return;
    }

    const tokenLastFourDigit = this.token.substring(this.token.length - 5);
    this.retry = true;

    if (
      !this.retryCountStore[tokenLastFourDigit] ||
      this.retryCountStore[tokenLastFourDigit] >= 20
    ) {
      this.retryCountStore[tokenLastFourDigit] = 0;
    }

    this.retryCountStore[tokenLastFourDigit] =
      this.retryCountStore[tokenLastFourDigit] + 1;
    /*
      Initial retry is 5 seconds and consecutive
      retry is mulitple of number of retries to allow
      enough time for network recovery or for something bad.
    */
    const timer = Math.pow(this.retryCountStore[tokenLastFourDigit], 2) * 500;

    logger.info(
      'No connection, will attempt to retry for bot token ' +
        tokenLastFourDigit +
        ' in ' +
        timer / 1000 +
        ' seconds'
    );

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
  makeRequest(options, postData) {
    return handleRequest(options, postData).then((slackData) => {
      const userOptions = {
        agent: options.agent,
        userId: slackData.self.id,
        botToken: this.token,
      };
      return getUserInfo(userOptions).then((userInfo) => {
        return Object.assign(slackData, { self: userInfo.user });
      });
    });
  }

  /**
   * Function to setup socket connection to slack.
   * @param {object} slackData slack data.
   *
   * @return {object} Promise resolves to success or failure.
   */
  setupSocket(slackData) {
    return Promise.resolve(this.socket.setupSocketConnectionEvents(slackData));
  }

  /**
   * Function to close socket connection to slack.
   */
  close() {
    this.socket.close();
  }

  /**
   * Function to shutdown socket connection to slack.
   */
  shutdown() {
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
const handleRequest = function (options, postData) {
  return Promise.resolve({
    then: (onFulfill, onReject) => {
      const req = request(options, function (response) {
        let responseStr = '';

        response.on('data', function (chunk) {
          responseStr += chunk;
        });

        response.on('end', function () {
          const slackData = handleResponse(responseStr);
          if (slackData.error) {
            return onReject(slackData.error);
          }

          return onFulfill(slackData);
        });
      }).on('error', function (err) {
        logger.info('Unknown error on connecting to slack ', err);
        onReject({
          error: 'unkown_error',
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
const handleResponse = function (responseStr) {
  let slackData = {};

  try {
    slackData = JSON.parse(responseStr);
    logger.debug('Slack message events', slackData);
  } catch (err) {
    logger.error('Slack response corrupted ', slackData);
    slackData.error = 'invalid_slack_response';
  }

  if (get(slackData, 'error') === 'invalid_auth') {
    logger.info('Invalid auth token. Unable to connect');
    slackData.error = 'invalid_auth';
  } else if (get(slackData, 'error')) {
    logger.info('Error connecting to slack ', get(slackData, 'error'));
    slackData.error = 'invalid_connection_string';
  } else if (!get(slackData, 'url')) {
    slackData.error = get(slackData, 'error');
    logger.info('Something wrong', slackData.error);
  }

  return slackData;
};

export { Connector };
