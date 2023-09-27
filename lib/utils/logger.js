'use strict';

import * as lodash from 'lodash-es';
import env from '../utils/environment.js';

const { isFunction, compact, trim, get } = lodash;

/**
 * Represents set and methods for logging.
 */
const Logger = class {
  /**
   * Creates a new Logger instance.
   *
   * @class
   */
  constructor(logger) {
    if (logger) {
      this.setLog(logger);
    }
  }

  /**
   * Function to log info level.
   *
   * @param {string} message message to log.
   * @param {array} args argument to logger handle.
   */
  log(message, ...args) {
    args = args ? args : '';
    this._log(this.getLog().log, 'log', message, ...args);
  }

  /**
   * Function to log info level.
   *
   * @param {string} message message to log.
   * @param {array} args argument to logger handle.
   */
  info(message, ...args) {
    args = args ? args : '';
    this._log(this.getLog().log, 'info', message, ...args);
  }

  /**
   * Function to log debug level.
   *
   * @param {string} message message to log.
   * @param {array} args argument to logger handle.
   */
  debug(message, ...args) {
    args = args ? args : '';
    this._log(this.getLog().debug, 'debug', message, ...args);
  }

  /**
   * Function to log error level.
   *
   * @param {string} message message to log.
   * @param {array} args argument to logger handle.
   */
  error(message, ...args) {
    args = args ? args : '';
    this._log(this.getLog().error, 'error', message, ...args);
  }

  /**
   * Function to handle logic for console logging.
   *
   * @param {function} handler log handler.
   * @param {string} level log level.
   * @param {string} message log message.
   * @param {array} args log arguments.
   */
  _log(handler, level, message, ...args) {
    const logHandler = isFunction(handler) ? handler : this.getLog().log;

    if (this.isTest()) {
      return;
    } else if (this.isProd(level)) {
      logHandler('%j', this.prefixTime(message, ...args));
    } else if (this.isNonProd(level)) {
      logHandler('%j', this.prefixTime(message, ...args));
    } else if (this.isDebug(level)) {
      logHandler('%j', this.prefixTime(message, ...args));
    }
  }

  /**
   * Function to set logger instance.
   *
   * @param {handler} logger logger handler.
   */
  setLogger(logger) {
    return this.setLog(logger || console);
  }

  /**
   * Function to prefix timestamp to console message.
   *
   * @param {string} message log message.
   * @param {array} stringArgs log args.
   * @return {object} log message with timestamp.
   */
  prefixTime(message, ...args) {
    const time = new Date().toISOString();
    let log;

    if (message) {
      log = {
        time: time,
        message: trim(message),
      };
    }

    if ((args || []).length > 0) {
      log.data = compact(args);
    }

    return log;
  }

  /**
   * Function to validate if NODE_ENV is dev mode and not test.
   *
   * @return {boolean} true or false.
   */
  isDebug(level) {
    return this.getEnv().dev && level == 'debug';
  }

  /**
   * Function to validate if NODE_ENV is prod mode.
   *
   * @return {boolean} true or false.
   */
  isProd(level) {
    return this.getEnv().prod && level !== 'debug';
  }

  /**
   * Function to validate if NODE_ENV is prod mode.
   *
   * @return {boolean} true or false.
   */
  isNonProd() {
    return !this.getEnv().prod;
  }

  /**
   * Function to validate if NODE_ENV is test mode.
   *
   * @return {boolean} true or false.
   */
  isTest() {
    return !!this.getEnv().test;
  }

  /**
   * Function to get env.
   *
   * @return {object} prod or test or dev.
   */
  getEnv() {
    return env;
  }
  /**
   * Function to validate if log handler is console.
   *
   * @return {boolean} true or false.
   */
  isConsole() {
    return get(this, 'logger.constructor.name') === 'Console';
  }

  setLog(logger) {
    this.logger = logger;
    return logger;
  }

  getLog() {
    return this.logger;
  }
};

const loggerInstance = new Logger(console);
export default loggerInstance;
