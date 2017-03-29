/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const _ = require('lodash');
const path = require('path');
const root = '..';

const env = require(path.join(root, 'utils/environment'));

const externals = {};

var Logger = class {
  constructor (customLogger) {
    this.logger = customLogger || console;
  }

  info (message, ...args) {
    args = args ? args : '';
    if (_.isFunction(this.logger.info) && !env.test) {
      this.logger.info(prefixTime(message), ...args);
    }
  }

  debug (message, ...args) {
    args = args ? args : '';
    if (_.isFunction(this.logger.info) && env.dev) {
      this.logger.info(prefixTime(message), JSON.stringify(...args));
    }
  }

  error (message, ...args) {
    args = args ? args : '';
    if (_.isFunction(this.logger.info) && env.dev) {
      this.logger.info(prefixTime(message), JSON.stringify(...args));
    }
  }
};

externals.setLogger = function (logger) {
  externals.logger = logger ? new Logger(logger) : new Logger();
};

function prefixTime (message) {
  return '[ ' + new Date().toLocaleString() + ' ] ' + message;
}

module.exports = externals;
