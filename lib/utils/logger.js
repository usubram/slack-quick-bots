/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const _ = require('lodash');
const env = require('./environment');

const externals = {};

var Logger = class {
  constructor (customLogger) {
    this.logger = customLogger || console;
  }

  info (message, ...args) {
    if (_.isFunction(this.logger.info) && !env.test) {
      this.logger.info(message, ...args);
    }
  }

  debug (message, ...args) {
    if (_.isFunction(this.logger.info) && env.dev) {
      this.logger.info(message, ...args);
    }
  } 

  error (message, ...args) {
    if (_.isFunction(this.logger.info) && env.dev) {
      this.logger.info(message, ...args);
    }
  }
};

externals.setLogger = function (logger) {
  externals.logger = logger ? new Logger(logger) : new Logger();
};

module.exports = externals;
