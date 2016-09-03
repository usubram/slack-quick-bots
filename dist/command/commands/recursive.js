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
var storage = require(path.join(root, '../storage/storage'));

var externals = {};

externals.Recursive = function (_Command) {
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

      return Promise.resolve({
        then: function then(onFulfill, onReject) {
          var time = _this2.getParams(parsedMessage, 0);
          time = _.isNumber(time) ? time : 1;

          if (_this2.getCommand().timeUnit === 'h') {
            time = time * 3600000;
          } else {
            time = time * 60000; // default to minute
          }
          _this2.setEventStoreParsedMessage(parsedMessage);

          _this2.setTimer(parsedMessage, setInterval(function () {
            _this2.quietRespond(parsedMessage);
          }, time));

          storage.updateEvents(_this2.getSlackData().self.name, 'events', {
            parsedMessage: parsedMessage,
            channels: [parsedMessage.channel]
          }).then(function () {
            onFulfill(parsedMessage);
          }).catch(function (err) {
            onReject(err);
          });
        }
      });
    }
  }, {
    key: 'process',
    value: function process(parsedMessage) {
      var _this3 = this;

      return Promise.resolve({
        then: function then(onFulfill, onReject) {
          _this3.callback = function (data) {
            onFulfill(_this3.message.bind(_this3, parsedMessage)(data));
          };

          try {
            _this3.getCommand().data.apply(_this3, [{
              command: parsedMessage.message.command, params: parsedMessage.message.params
            }, _this3.buildOptions(parsedMessage, _this3.getSlackData(), _this3.purpose), _this3.callback]);
          } catch (err) {
            botLogger.logger.error('Command: error calling handler,' + 'make sure to pass a proper function', err, err.stack);
            return onReject(err);
          }
        }
      });
    }
  }, {
    key: 'notify',
    value: function notify(parsedMessage) {
      var _this4 = this;

      return Promise.resolve({
        then: function then(onFulfill) {
          _this4.messageHandler({
            channels: parsedMessage.channel,
            message: responseHandler.generateBotResponseTemplate({
              parsedMessage: parsedMessage,
              /* jshint ignore:start */
              recursive_success: true
            })
          });
          onFulfill();
        }
      });
    }
  }, {
    key: 'message',
    value: function message(parsedMessage, data) {
      if (data && this.getCommand().responseType || _.get(data, 'type')) {
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
          this.messageHandler({
            channels: [parsedMessage.channel],
            message: this.template(data)
          });
        } catch (err) {
          botLogger.logger.error('Command: make sure to pass a' + 'compiled handlebar template', err, err.stack);
        }
      }
    }
  }]);

  return _class;
}(Command);

module.exports = externals.Recursive;