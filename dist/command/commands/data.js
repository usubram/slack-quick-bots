/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _ = require('lodash');
var path = require('path');
var root = '..';

var botLogger = require(path.join(root, '../utils/logger'));
var Command = require(path.join(root, 'command'));
var responseHandler = require(path.join(root, '../bot/response-handler'));

var externals = {};

externals.Data = function (_Command) {
  _inherits(_class, _Command);

  function _class(options) {
    var _ret;

    _classCallCheck(this, _class);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(_class).call(this, options));

    return _ret = _this, _possibleConstructorReturn(_this, _ret);
  }

  _createClass(_class, [{
    key: 'preprocess',
    value: function preprocess(parsedMessage) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        _this2.template = '';
        _this2.purpose = _this2.getHook() ? _this2.getHook().getHookPurpose(parsedMessage.channel) : '';
        _this2.hookContext = _this2.getHookContext(_this2.purpose, parsedMessage.channel, parsedMessage.message.command);

        _this2.setDefaultParams(_this2.getCommand(), parsedMessage, 0);

        try {
          _this2.template = _this2.getCommand().template ? _this2.getCommand().template() : '';
        } catch (err) {
          botLogger.logger.error('Command: make sure to pass a compiled handlebar template', err);
          return reject(err);
        }

        resolve(parsedMessage);
      });
    }
  }, {
    key: 'process',
    value: function process(parsedMessage) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        try {
          _this3.callback = function (data) {
            resolve(_this3.message.bind(_this3, parsedMessage)(data));
          };
          _this3.getCommand().data.apply(_this3, [{
            command: parsedMessage.message.command, params: parsedMessage.message.params
          }, _this3.buildOptions(parsedMessage, _this3.getSlackData(), _this3.purpose), _this3.callback]);
        } catch (err) {
          botLogger.logger.error('Command: error calling handler,' + 'make sure to pass a proper function', err, err.stack);
          return reject(err);
        }
      });
    }
  }, {
    key: 'message',
    value: function message(parsedMessage, data) {
      if (this.getCommand().responseType || _.get(data, 'responseType')) {
        responseHandler.processFile({
          channels: [parsedMessage.channel],
          message: {
            data: data,
            commandName: parsedMessage.message.command,
            config: this.getCommand().responseType
          }
        }, this.getBotConfig().botToken);
      } else if (data && _.isFunction(this.template)) {
        try {
          var renderedData = this.template(data);
          this.messageHandler({
            channels: [parsedMessage.channel],
            message: renderedData
          });
          return renderedData;
        } catch (err) {
          botLogger.logger.error('Command: make sure to pass a' + 'compiled handlebar template', err, err.stack);
        }
      }
    }
  }]);

  return _class;
}(Command);

module.exports = externals.Data;