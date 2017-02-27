/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const root = '..';

const _ = require('lodash');
const path = require('path');

const Connector = require(path.join(root, 'bot/connector'));

const externals = {};
const localSocketServer = 'ws://0.0.0.0:4080';

externals.MockConnector = class extends Connector {
  constructor (token, options) {
    super(token, options);
  }

  makeRequest () {
    this.retryAttempt = this.retryAttempt || 0;

    this.retryAttempt++;

    if (this.retryAttempt >= _.get(this, 'options.mock.retryAttempt', 0)) {
      if (this.options.mock.error) {
        return Promise.reject({
          error: this.options.mock.error
        });
      }

      return Promise.resolve(
        _.extend(this.options.mock, {
          url: localSocketServer
        })
      );
    } else {
      return Promise.reject({
        error: 'unkown error'
      });
    }
  }
};

module.exports = externals.MockConnector;
