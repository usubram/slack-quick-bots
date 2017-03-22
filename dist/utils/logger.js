/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');
var path = require('path');
var root = '..';

var env = require(path.join(root, 'utils/environment'));

var externals = {};

var Logger = function () {
  function Logger(customLogger) {
    _classCallCheck(this, Logger);

    this.logger = customLogger || console;
  }

  _createClass(Logger, [{
    key: 'info',
    value: function info(message) {
      if (_.isFunction(this.logger.info) && !env.test) {
        var _logger;

        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        (_logger = this.logger).info.apply(_logger, [prefixTime(message)].concat(args));
      }
    }
  }, {
    key: 'debug',
    value: function debug(message) {
      if (_.isFunction(this.logger.info) && env.dev) {
        var _logger2;

        for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          args[_key2 - 1] = arguments[_key2];
        }

        (_logger2 = this.logger).info.apply(_logger2, [prefixTime(message)].concat(args));
      }
    }
  }, {
    key: 'error',
    value: function error(message) {
      if (_.isFunction(this.logger.info) && env.dev) {
        var _logger3;

        for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
          args[_key3 - 1] = arguments[_key3];
        }

        (_logger3 = this.logger).info.apply(_logger3, [prefixTime(message)].concat(args));
      }
    }
  }]);

  return Logger;
}();

externals.setLogger = function (logger) {
  externals.logger = logger ? new Logger(logger) : new Logger();
};

function prefixTime(message) {
  return '[ ' + new Date() + ' ] ' + message;
}

module.exports = externals;