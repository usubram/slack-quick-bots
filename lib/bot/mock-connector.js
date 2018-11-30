/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2018 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

const root = '..';

const _ = require('lodash');
const path = require('path');

const Connector = require(path.join(root, 'bot/connector'));

const externals = {};
const localSocketServer = 'ws://0.0.0.0:4080';

/**
*
* Represents the state and events of a mock connector.
*
*/
externals.MockConnector = class extends Connector {
  /**
  * Creates a new mock connector instance.
  *
  * @param {string} token Bot token.
  * @param {object} options Connection options.
  * @param {function} options.httpAgent http proxy agent.
  * @param {function} options.socketAgent socket proxy agent.
  * @param {object} options.socketEventEmitter event emitter.
  * @class
  */
  constructor (token, options) {
    super(token, options);
  }

  /**
  * Function to mock slack rtm request.
  *
  * @return {object} Promise resolves to success or failure.
  */
  makeRequest () {
    this.retryAttempt = this.retryAttempt || 0;

    this.retryAttempt++;

    if (this.retryAttempt >= _.get(this, 'options.mock.retryAttempt', 0)) {
      if (this.options.mock.error) {
        return Promise.reject({
          error: this.options.mock.error,
        });
      }

      return Promise.resolve(
        _.extend(this.options.mock, {
          url: localSocketServer,
        })
      );
    } else {
      return Promise.reject({
        error: 'unkown error',
      });
    }
  }
};

module.exports = externals.MockConnector;
