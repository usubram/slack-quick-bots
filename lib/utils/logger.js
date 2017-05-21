/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2017 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

const _ = require('lodash');
const path = require('path');
const root = '..';

const env = require(path.join(root, 'utils/environment'))();

/**
* Represents set and methods for logging.
*/
const Logger = class {
  /**
  * Creates a new Logger instance.
  *
  * @class
  */
  constructor () {
    this.logger = console;
  }

  /**
  * Function to log info level.
  *
  * @param {string} message message to log.
  * @param {array} args argument to logger handle.
  */
  info (message, ...args) {
    args = args ? args : '';
    this.log(this.logger.info, 'info', message, ...args);
  }

  /**
  * Function to log debug level.
  *
  * @param {string} message message to log.
  * @param {array} args argument to logger handle.
  */
  debug (message, ...args) {
    args = args ? args : '';
    this.log(this.logger.debug, 'debug', message, ...args);
  }

  /**
  * Function to log error level.
  *
  * @param {string} message message to log.
  * @param {array} args argument to logger handle.
  */
  error (message, ...args) {
    args = args ? args : '';
    this.log(this.logger.error, 'error', message, ...args);
  }

  /**
  * Function to handle logic for console logging.
  *
  * @param {function} handler log handler.
  * @param {string} level log level.
  * @param {string} message log message.
  * @param {array} args log arguments.
  */
  log (handler, level, message, ...args) {
    if (this.isTest()) {
      return;
    } else if (this.isConsole() && !this.isDebug() && level === 'info') {
      const stringArgs = JSON.stringify(...args);
      this.logger.log(this.prefixTime(message, stringArgs));
    } else if (this.isConsole() && this.isDebug()) {
      const stringArgs = JSON.stringify(...args);
      this.logger.log(this.prefixTime(message, stringArgs));
    } else if (_.isFunction(handler)) {
      handler(message, ...args);
    }
  }

  /**
  * Function to set logger instance.
  *
  * @param {handler} logger logger handler.
  */
  setLogger (logger) {
    this.logger = logger ? logger : console;
  }

  /**
  * Function to prefix timestamp to console message.
  *
  * @param {string} message log message.
  * @param {array} stringArgs log args.
  * @return {object} log message with timestamp.
  */
  prefixTime (message, stringArgs) {
    const time = new Date().toISOString();

    return {
      time: time,
      message: message + (stringArgs || ''),
    };
  }

  /**
  * Function to validate if NODE_ENV is dev mode and not test.
  *
  * @return {boolean} true or false.
  */
  isDebug () {
    return !env.test && env.dev;
  }

  /**
  * Function to validate if NODE_ENV is test mode.
  *
  * @return {boolean} true or false.
  */
  isTest () {
    return !!env.test;
  }

  /**
  * Function to validate if log handler is console.
  *
  * @return {boolean} true or false.
  */
  isConsole () {
    return _.get(this, 'logger.constructor.name') === 'Console';
  }
};

module.exports = new Logger();
