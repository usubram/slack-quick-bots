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
var WebSocketPlugin = require('ws');
var root = '..';

var botLogger = require(path.join(root, 'utils/logger'));

var Socket = function () {
  function Socket(slackData, options) {
    _classCallCheck(this, Socket);

    this.isShutdown = false;
    this.slackData = slackData;
    this.ws = new WebSocketPlugin(this.slackData.url);
    this.botName = _.get(this.slackData, 'self.name');
    this.id = _.get(this.slackData, 'self.id');
    this.socketEventEmitter = options.socketEventEmitter;

    return this.registerSocketEvents(options);
  }

  _createClass(Socket, [{
    key: 'registerSocketEvents',
    value: function registerSocketEvents() {
      return Promise.all([this.registerOnMessageEvent(), this.registerOnCloseEvent(), this.registerOnSocketOpenEvent()]).then(function (result) {
        return result[2];
      }).catch(function (err) {
        botLogger.logger.error('Socket: registerEvents failed with', err);
      });
    }
  }, {
    key: 'registerOnMessageEvent',
    value: function registerOnMessageEvent() {
      var _this = this;

      return Promise.resolve({
        then: function then(onFulfill) {
          _this.ws.on('message', function (data) {

            var slackMessage = '';

            try {
              slackMessage = JSON.parse(data);
            } catch (err) {
              botLogger.logger.error('Socket: slack message is not good', data);
            }

            /* jshint ignore:start */
            if (slackMessage && slackMessage.type === 'message' && _.isEmpty(slackMessage.reply_to) && !slackMessage.subtype) {
              _this.emitEvent('message', slackMessage);
            }
            /* jshint ignore:end */
          });
          return onFulfill();
        }
      });
    }
  }, {
    key: 'registerOnCloseEvent',
    value: function registerOnCloseEvent() {
      var _this2 = this;

      return Promise.resolve({
        then: function then(onFulfill) {
          _this2.ws.on('close', function () {

            if (_this2.isShutdown) {
              _this2.isShutdown = false;
              _this2.emitEvent('shutdown');
            } else {
              _this2.emitEvent('close');
            }

            botLogger.logger.info('Socket: closing bot ', _this2.botName);
          });
          return onFulfill();
        }
      });
    }
  }, {
    key: 'registerOnSocketOpenEvent',
    value: function registerOnSocketOpenEvent() {
      var _this3 = this;

      return Promise.resolve({
        then: function then(onFulfill) {
          _this3.ws.on('open', function () {

            _this3.wsPingPongTimmer = setInterval(function () {
              try {
                _this3.emitEvent('ping', {
                  channels: '',
                  message: '',
                  type: 'ping'
                }, function (err) {
                  if (err) {
                    _this3.clearPingPongTimer();
                  }
                });
              } catch (err) {
                _this3.clearPingPongTimer();
              }
            }, 1000);

            return onFulfill(_this3);
          });
        }
      });
    }
  }, {
    key: 'connectionCloseEvent',
    value: function connectionCloseEvent() {
      if (this.wsPingPongTimmer) {
        clearInterval(this.wsPingPongTimmer);
      }
      botLogger.logger.info('Socket: connection closed for', this.botName);
      this.connectionManager.reconnect(this);
    }
  }, {
    key: 'close',
    value: function close() {
      this.ws.close();
    }
  }, {
    key: 'shutdown',
    value: function shutdown() {
      this.isShutdown = true;
      this.ws.close();
    }
  }, {
    key: 'getId',
    value: function getId() {
      return this.id;
    }
  }, {
    key: 'getBotName',
    value: function getBotName() {
      return _.camelCase(this.botName);
    }
  }, {
    key: 'getSlackData',
    value: function getSlackData() {
      return this.slackData;
    }
  }, {
    key: 'emitEvent',
    value: function emitEvent(eventName) {
      if (this.socketEventEmitter) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        this.socketEventEmitter.emit(eventName, args);
      }
    }
  }, {
    key: 'clearPingPongTimer',
    value: function clearPingPongTimer() {
      if (this.wsPingPongTimmer) {
        botLogger.logger.info('Socket: connection closed on ping pong', _.get(this, 'botName'));
        clearInterval(this.wsPingPongTimmer);
        this.emitEvent('reconnect');
      }
    }
  }, {
    key: 'sendMessage',
    value: function sendMessage(message, callback) {
      try {
        // TODO: queue the message on failure.
        this.ws.send(message, callback);
      } catch (err) {
        botLogger.logger.error('Socket: socket connection error', err);
      }
    }
  }]);

  return Socket;
}();

module.exports = Socket;