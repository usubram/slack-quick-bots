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

var botLogger = require('./../../lib/utils/logger');
var _ = require('lodash');
var EventEmitter = require('events');
var socket = require('./socket');
var ResponseHandler = require('./response-handler');
var Command = require('./../command/command');
var messageParser = require('./../command/message');
var storage = require('./../storage/storage');
var Hook = require('./hook');

var internals = {};
var externals = {};

externals.Bot = function () {
  function _class(bot) {
    _classCallCheck(this, _class);

    this.config = Object.assign({}, bot);
    this.eventEmitter = new EventEmitter();
    this.command = new Command(this.config.botCommand);
    this.command.eventEmitter = new EventEmitter();
    this.responseHandler = {};
    this.ws = {};
    this.slackData = '';
    this.botName = '';
    this.id = '';

    this.setupBotEvents();
    this.registerEvents();
  }

  _createClass(_class, [{
    key: 'setupBotEvents',
    value: function setupBotEvents() {
      var _this = this;

      this.eventEmitter.on('attachSocket', function (botInfo) {
        botLogger.logger.info('Bot: attaching ws event for', botInfo.slackData.self.name);
        _this.ws = botInfo.ws;
        _this.command.slackData = botInfo.slackData;
        _this.botName = botInfo.slackData.self.name;
        _this.id = botInfo.slackData.self.id;

        if (_this.server) {
          _this.command.hook = new Hook(_this.id, _this.server);
        }

        _this.responseHandler = new ResponseHandler(_this.config.botCommand, _this.botName);

        _this.loadEvents();

        /* jshint ignore:start */
        _this.ws.on('message', function (data) {
          var slackMessage = JSON.parse(data);
          if (slackMessage && slackMessage.type === 'message' && slackMessage.reply_to !== '' && !slackMessage.subtype) {
            _this.handleMessage(slackMessage);
          }
        });
        /* jshint ignore:end */

        _this.ws.on('open', function () {
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
                clearInterval(_this.wsPingPongTimmer);
                botLogger.logger.info('Bot: connection closed on ping pong', botInfo.botName);
                socket.reconnect(_this);
              }
            }
          }, 2000);
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
      });

      this.eventEmitter.on('hookCast', function (purposeId, data, response, callback) {
        _this.command.sendResponseToHook(purposeId, data, response, callback);
      });
    }
  }, {
    key: 'loadEvents',
    value: function loadEvents() {
      var _this2 = this;

      storage.getEvents('events').then(function (eventsData) {
        var savedEvents = _.values(eventsData[_this2.botName]);
        if (savedEvents && savedEvents.length) {
          savedEvents.reduce(function (evPromise, savedEvent) {
            return _this2.command.loadCommand(savedEvent.parsedMessage).then(function (done) {
              if (done) {
                botLogger.logger.info('Successfully loaded event:', savedEvent);
              }
            });
          }, Promise.resolve());
        }
      });
    }
  }, {
    key: 'handleMessage',
    value: function handleMessage(message) {
      var _this3 = this;

      var parsedMessage = messageParser.parse(message, this.responseHandler.isDirectMessage(message));

      if (this.id === parsedMessage.message.commandPrefix) {
        parsedMessage.message.commandPrefix = _.camelCase(this.botName);
      }

      if (this.config.blockDirectMessage && !this.responseHandler._isPublicMessage(message)) {
        this.dispatchMessage({
          channels: parsedMessage.channel,
          message: this.responseHandler.generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            channels: [parsedMessage.channel],
            message: {
              /* jshint ignore:start */
              bot_direct_message_error: true
              /* jshint ignore:end */
            }
          })
        });
        return;
      }

      if (this.responseHandler.isDirectMessage(message) || _.camelCase(this.botName) === parsedMessage.message.commandPrefix) {

        this.command.validateCommand(parsedMessage, function (err) {
          if (err) {
            _this3.handleErrorMessage(_this3.botName, err);
          } else {
            _this3.typingMessage(parsedMessage);
            _this3.command.respondToCommand(parsedMessage);
          }
        });
      }
    }
  }, {
    key: 'dispatchMessage',
    value: function dispatchMessage(options, callback) {
      var _this4 = this;

      callback = _.isFunction(callback) ? callback : undefined;
      options.channels = _.isArray(options.channels) ? options.channels : [options.channels];
      _.forEach(options.channels, function (channel) {
        try {
          _this4.ws.send(JSON.stringify({
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
    key: 'typingMessage',
    value: function typingMessage(message) {
      this.dispatchMessage({
        channels: message.channel,
        message: '',
        type: 'typing'
      });
    }
  }, {
    key: 'handleErrorMessage',
    value: function handleErrorMessage(botName, context) {
      this.dispatchMessage({
        channels: context.parsedMessage.channel,
        message: this.responseHandler.generateErrorTemplate(context)
      });
    }
  }, {
    key: 'registerEvents',
    value: function registerEvents() {
      var _this5 = this;

      this.command.eventEmitter.on('command:setup:alert', function (context) {
        internals.persistEvent(_this5.botName, context);
        _this5.dispatchMessage({
          channels: context.parsedMessage.channel,
          message: _this5.responseHandler.generateBotResponseTemplate(context)
        });
      });

      this.command.eventEmitter.on('command:setup:recursive', function (context) {
        internals.persistEvent(_this5.botName, context);

        _this5.dispatchMessage({
          channels: context.parsedMessage.channel,
          message: _this5.responseHandler.generateBotResponseTemplate(context)
        });
      });

      this.command.eventEmitter.on('command:recursive:kill', function (context) {
        internals.removeRequest(_this5.botName, context);
        _this5.dispatchMessage({
          channels: context.parsedMessage.channel,
          message: _this5.responseHandler.generateBotResponseTemplate(context)
        });
      });

      this.command.eventEmitter.on('command:data:respond', function (context) {
        _this5.dispatchMessage({
          channels: context.channels,
          message: context.message.data
        });
      });

      this.command.eventEmitter.on('command:data:file', function (context) {
        _this5.responseHandler.processFile(context, _this5.config.botToken);
      });

      this.command.eventEmitter.on('command:alert:respond', function (context) {
        _this5.dispatchMessage({
          channels: context.channels,
          message: _this5.responseHandler.generateAlertResponseTemplate(context)
        });
      });

      this.command.eventEmitter.on('command:alert:sample', function (context) {
        _this5.dispatchMessage({
          channels: context.channels,
          message: _this5.responseHandler.generateAlertResponseTemplate(context)
        });
      });

      this.command.eventEmitter.on('command:hook:respond', function (context) {
        _this5.dispatchMessage({
          channels: context.channels,
          message: context.data.hook
        });
      });
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

internals.persistEvent = function (botName, message) {
  storage.updateEvents(botName, 'event', message);
};

internals.removeRequest = function (botName, message) {
  storage.removeEvents(botName, 'event', message);
};

module.exports = externals.Bot;