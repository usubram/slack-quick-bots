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

var Logger = class {
  constructor () {
    this.logger = console;
  }

  info (message, ...args) {
    args = args ? args : '';
    this.log(this.logger.info, message, ...args);
  }

  debug (message, ...args) {
    args = args ? args : '';
    this.log(this.logger.debug, message, ...args);
  }

  error (message, ...args) {
    args = args ? args : '';
    this.log(this.logger.error, message, ...args);
  }

  log (handler, message, ...args) {
    if (this.isConsole()) {
      if (this.isDebug()) {
        const stringArgs = JSON.stringify(...args);
        this.logger.log(this.prefixTime(message, stringArgs));
      }
    } else if (_.isFunction(handler)) {
      handler(message, ...args);
    }
  }

  setLogger (logger) {
    this.logger = logger ? logger : console;
  }

  prefixTime (message, stringArgs) {
    const time = new Date().toISOString();

    return {
      time: time,
      message: message + (stringArgs || '')
    };
  }

  isDebug () {
    return !env.test && env.dev;
  }

  isConsole () {
    return _.get(this, 'logger.constructor.name') === 'Console';
  }
};

module.exports = new Logger();
