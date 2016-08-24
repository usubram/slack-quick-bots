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

var _ = require('lodash');
var path = require('path');

var root = '..';

var botLogger = require(path.join(root, 'utils/logger'));
var CommandFactory = require(path.join(root, 'command/command-factory'));
var Hook = require(path.join(root, 'bot/hook'));
var messageParser = require(path.join(root, 'command/message'));
var responseHandler = require(path.join(root, 'bot/response-handler'));
var socket = require(path.join(root, 'bot/socket'));

var internals = {};
var externals = {};

externals.Bot = function () {
  function _class(bot) {
    _classCallCheck(this, _class);

    this.config = Object.assign({}, bot);
    this.ws = {};
    this.slackData = '';
    this.botName = '';
    this.hook = {};
    this.id = '';
  }

  _createClass(_class, [{
    key: 'setupBotEvents',
    value: function setupBotEvents(testEvents) {
      var _this = this;

      return new Promise(function (resolve) {

        botLogger.logger.info('Bot: attaching ws event for', _this.slackData.self.name);
        _this.botName = _this.slackData.self.name;
        _this.id = _this.slackData.self.id;
        _this.hook = _this.server ? new Hook(_this.id, _this.server) : undefined;

        /* jshint ignore:start */
        _this.ws.on('message', function (data) {
          var slackMessage = '';
          try {
            slackMessage = JSON.parse(data);
          } catch (err) {
            botLogger.logger.error('Bot: slack message is not goood', data);
          }

          if (slackMessage && slackMessage.type === 'message' && slackMessage.reply_to !== '' && !slackMessage.subtype) {
            _this.handleMessage(slackMessage);
          }
        });
        /* jshint ignore:end */

        _this.ws.on('open', function () {
          if (!_this.command) {
            _this.command = _this.loadCommands();
          }

          _this.reconnection = false;
          _this.wsPingPongTimmer = setInterval(function () {
            try {
              _this.dispatchMessage({
                channels: '',
                message: '',
                type: 'ping'
              }, function (err) {
                if (err) {
                  socket.reconnect(_this);
                }
              });
            } catch (err) {
              botLogger.logger.info('Bot: ping pong error', err);
              if (_this.wsPingPongTimmer) {
                // botLogger.logger.info('Bot: connection closed on ping pong', botInfo.botName);
                clearInterval(_this.wsPingPongTimmer);
                socket.reconnect(_this);
              }
            }
          }, 2000);
          resolve();
        });

        _this.ws.on('close', function () {
          if (_this.wsPingPongTimmer) {
            clearInterval(_this.wsPingPongTimmer);
          }
          botLogger.logger.info('Bot: connection closed for', _this.botName);
          if (!_this.shutdown) {
            _this.shutdown = false;
            socket.reconnect(_this);
          }
        });

        if (testEvents) {
          _.set(_this, 'events.input', function (message) {
            return new Promise(function (resolve) {
              _this.ws.send(message);
              _.set(_this, 'events.output', resolve);
            });
          });
        }
      });
    }
  }, {
    key: 'handleMessage',
    value: function handleMessage(message) {
      var _this2 = this;

      var parsedMessage = messageParser.parse(message, responseHandler.isDirectMessage(message));
      if (this.id === parsedMessage.message.commandPrefix) {
        parsedMessage.message.commandPrefix = _.camelCase(this.botName);
      }
      if (this.config.blockDirectMessage && !responseHandler.isPublicMessage(message)) {
        this.handleBotMessages(parsedMessage);
        if (_.isFunction(_.get(this, 'events.output'))) {
          _.get(this, 'events.output')(this.handleBotMessages(parsedMessage));
        }
        return;
      }

      if (responseHandler.isDirectMessage(message) || _.camelCase(this.botName) === parsedMessage.message.commandPrefix) {
        this.command.handleMessage(parsedMessage).then(function (response) {
          if (_.isFunction(_.get(_this2, 'events.output'))) {
            _.get(_this2, 'events.output')(response);
          }
        }).catch(function (err) {
          _this2.handleErrorMessage(_this2.botName, err);
          if (_.isFunction(_.get(_this2, 'events.output'))) {
            _.get(_this2, 'events.output')(_this2.handleErrorMessage(_this2.botName, err));
          }
        });
        return;
      }
      if (_.isFunction(_.get(this, 'events.output'))) {
        _.get(this, 'events.output')();
      }
    }
  }, {
    key: 'loadCommands',
    value: function loadCommands() {
      var _this3 = this;

      return new CommandFactory({
        getBotConfig: function getBotConfig() {
          return _this3.config;
        },
        getSlackData: function getSlackData() {
          return _this3.slackData;
        },
        getHook: function getHook() {
          return _this3.hook;
        },
        messageHandler: function messageHandler(options, callback) {
          _this3.dispatchMessage(options, callback);
        }
      });
    }
  }, {
    key: 'handleHookRequest',
    value: function handleHookRequest(purposeId, data, response) {
      var _this4 = this;

      this.command.handleHook(purposeId, data, response).then(function (cmdResponse) {
        _this4.dispatchMessage(cmdResponse);
        response.end('{ "response": "ok" }');
      }).catch(function (errResponse) {
        response.end(JSON.stringify(errResponse));
      });
    }
  }, {
    key: 'dispatchMessage',
    value: function dispatchMessage(options, callback) {
      var _this5 = this;

      callback = _.isFunction(callback) ? callback : undefined;
      options.channels = _.isArray(options.channels) ? options.channels : [options.channels];
      _.forEach(options.channels, function (channel) {
        try {
          _this5.ws.send(JSON.stringify({
            'id': '',
            'type': options.type || 'message',
            'channel': channel,
            'text': '' + options.message
          }, internals.jsonReplacer).replace(/\n/g, '\n'), callback);
        } catch (err) {
          botLogger.logger.error('Bot: socket connection error', err);
        }
      });
    }
  }, {
    key: 'handleErrorMessage',
    value: function handleErrorMessage(botName, context) {
      var message = responseHandler.generateErrorTemplate(botName, this.config.botCommand, context);
      this.dispatchMessage({
        channels: context.parsedMessage.channel,
        message: message
      });
      return message;
    }
  }, {
    key: 'handleBotMessages',
    value: function handleBotMessages(parsedMessage) {
      var message = responseHandler.generateBotResponseTemplate({
        /* jshint ignore:start */
        bot_direct_message_error: true
        /* jshint ignore:end */
      });
      this.dispatchMessage({
        channels: parsedMessage.channel,
        message: message
      });
      return message;
    }
  }]);

  return _class;
}();

internals.jsonReplacer = function (key, value) {
  if (value && key === 'text') {
    return value.replace(/\n|\t/g, '').replace(/\\n/g, '\n');
  }
  return value;
};

module.exports = externals.Bot;