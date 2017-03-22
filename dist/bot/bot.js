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
var BotInterface = require(path.join(root, 'bot/bot-interface'));
var Connector = require(path.join(root, 'bot/connector'));
var CommandFactory = require(path.join(root, 'command/command-factory'));
var EventEmitter = require('events').EventEmitter;
var Hook = require(path.join(root, 'bot/hook'));
var MockConnector = require(path.join(root, 'bot/mock-connector'));
var messageParser = require(path.join(root, 'command/message'));
var storage = require(path.join(root, 'storage/storage'));
var responseHandler = require(path.join(root, 'bot/response-handler'));

var internals = {};
var externals = {};

externals.Bot = function () {
  function _class(bot) {
    _classCallCheck(this, _class);

    this.config = Object.assign({}, bot);
    this.ws = {};
    this.slackData = '';
    this.hook = {};
    this.eventEmitter = new EventEmitter();
    this.interfaceEventEmitter = new EventEmitter();
    this.botMessageParser = messageParser.parse(_.map(_.keys(_.get(this.config, 'botCommand')), _.toUpper));

    this.setupEvents();
    this.setupIntefaceEvents();
  }

  _createClass(_class, [{
    key: 'init',
    value: function init() {
      if (_.get(this.config, 'mock')) {
        botLogger.logger.debug('Bot: Connecting for bot %j', this);
        this.connectionManager = new MockConnector(this.config.botToken, {
          socketEventEmitter: this.eventEmitter,
          mock: _.get(this.config, 'mock')
        });
      } else {
        botLogger.logger.debug('Bot: Connecting for bot %j', this);
        this.connectionManager = new Connector(this.config.botToken, {
          socketEventEmitter: this.eventEmitter
        });
      }

      this.connectionManager.connect().catch(function (err) {
        botLogger.logger.error('Bot: Could not establish connection %j', err);
      });

      this.commandFactory = this.loadCommands();

      return this.botInterface;
    }
  }, {
    key: 'setupEvents',
    value: function setupEvents() {
      var _this = this;

      this.eventEmitter.on('close', function () {
        _this.botInterface.emit('close');
      }).on('connect', function () {
        _this.loadSavedEvents();
      }).on('reconnect', function () {
        _this.reconnect();
      }).on('shutdown', function () {
        _this.botInterface.emit('shutdown');
      }).on('start', function () {
        _this.botInterface.emit('start');
      }).on('ping', function (args) {
        _this.dispatchMessage.apply(_this, args);
      }).on('message', function (args) {
        _this.handleMessage.apply(_this, args);
      });
    }
  }, {
    key: 'setupIntefaceEvents',
    value: function setupIntefaceEvents() {
      var _this2 = this;

      this.interfaceEventEmitter.on('injectMessage', function (message) {
        _this2.injectMessage(message);
      });

      this.interfaceEventEmitter.on('shutdown', function () {
        _this2.shutdown();
      });

      this.interfaceEventEmitter.on('restart', function () {
        _this2.close();
      });

      this.interfaceEventEmitter.on('close', function () {
        _this2.close();
      });

      this.interfaceEventEmitter.on('start', function () {
        _this2.start();
      });

      this.botInterface = new BotInterface({
        getBotName: function getBotName() {
          return _this2.getBotName();
        },
        getId: function getId() {
          return _this2.getId();
        }
      }, this.interfaceEventEmitter);
    }
  }, {
    key: 'handleMessage',
    value: function handleMessage(message) {
      var _this3 = this;

      var parsedMessage = this.botMessageParser({
        id: this.getId(),
        name: this.getBotName()
      }, message);

      if (this.config.blockDirectMessage && !responseHandler.isPublicMessage(message)) {
        return this.handleBotMessages(parsedMessage);
      }

      return this.commandFactory.handleMessage(parsedMessage).catch(function (err) {
        return _this3.handleErrorMessage(_this3.getBotName(), err);
      });
    }
  }, {
    key: 'loadCommands',
    value: function loadCommands() {
      var _this4 = this;

      return new CommandFactory({
        getBotConfig: function getBotConfig() {
          return _this4.config;
        },
        getSlackData: function getSlackData() {
          return _this4.getSlackData();
        },
        getHook: function getHook() {
          return _this4.hook;
        },
        getEventStore: function getEventStore() {
          return _.get(_this4.eventStore, _this4.getBotName());
        },
        messageHandler: function messageHandler(options, callback) {
          _this4.dispatchMessage(options, callback);
        }
      });
    }
  }, {
    key: 'loadSavedEvents',
    value: function loadSavedEvents() {
      var _this5 = this;

      storage.getEvents(['events', 'schedule']).then(function (events) {
        _this5.eventStore = events;
        _this5.commandFactory.loadCommands();
        _this5.botInterface.emit('connect');
      }).catch(function (err) {
        botLogger.logger.error('Bot: Error loading event %j', err);
        _this5.commandFactory.loadCommands();
        _this5.botInterface.emit('connect');
      });

      this.hook = this.server ? new Hook(this.getId(), this.server) : undefined;
    }
  }, {
    key: 'handleHookRequest',
    value: function handleHookRequest(purposeId, data, response) {
      var _this6 = this;

      this.commandFactory.handleHook(purposeId, data, response).then(function (cmdResponse) {
        _this6.dispatchMessage(cmdResponse);
        response.end('{ "response": "ok" }');
      }).catch(function (errResponse) {
        response.end(JSON.stringify(errResponse));
      });
    }
  }, {
    key: 'dispatchMessage',
    value: function dispatchMessage(options, callback) {
      var _this7 = this;

      callback = _.isFunction(callback) ? callback : undefined;
      options.channels = _.isArray(options.channels) ? options.channels : [options.channels || options.channel];

      _.forEach(options.channels, function (channel) {

        var message = {
          'id': new Date().getTime().toString(),
          'type': options.type || 'message',
          'channel': channel,
          'text': '' + options.message
        };

        try {
          var messageStr = JSON.stringify(message, internals.jsonReplacer).replace(/\n/g, '\n');
          _this7.connectionManager.socket.sendMessage(messageStr, callback);
        } catch (err) {
          botLogger.logger.error('Bot: socket connection error', err);
        }

        _this7.handleMessageEvent(message);
      });
    }
  }, {
    key: 'handleErrorMessage',
    value: function handleErrorMessage(botName, context) {
      var renderedData = responseHandler.generateErrorTemplate(botName, this.config.botCommand, context);
      this.dispatchMessage({
        channels: context.parsedMessage.channel,
        message: renderedData
      });

      return Promise.resolve(renderedData);
    }
  }, {
    key: 'handleBotMessages',
    value: function handleBotMessages(parsedMessage) {
      var renderedData = responseHandler.generateBotResponseTemplate({
        /* jshint ignore:start */
        bot_direct_message_error: true
        /* jshint ignore:end */
      });

      this.dispatchMessage({
        channels: parsedMessage.channel,
        message: renderedData
      });

      return Promise.resolve(renderedData);
    }
  }, {
    key: 'close',
    value: function close() {
      this.connectionManager.close();
    }
  }, {
    key: 'shutdown',
    value: function shutdown() {
      this.connectionManager.shutdown();
    }
  }, {
    key: 'start',
    value: function start() {
      this.connectionManager.connect().catch(function (err) {
        botLogger.logger.log('Bot: Error connecting to slack %j', err);
      });
    }
  }, {
    key: 'reconnect',
    value: function reconnect() {
      this.connectionManager.reconnect();
    }
  }, {
    key: 'getId',
    value: function getId() {
      var socket = _.get(this, 'connectionManager.socket');
      return socket ? socket.getId() : undefined;
    }
  }, {
    key: 'getBotName',
    value: function getBotName() {
      var socket = _.get(this, 'connectionManager.socket');
      return socket ? socket.getBotName() : undefined;
    }
  }, {
    key: 'getSlackData',
    value: function getSlackData() {
      var socket = _.get(this, 'connectionManager.socket');
      return socket ? socket.getSlackData() : undefined;
    }
  }, {
    key: 'injectMessage',
    value: function injectMessage(messageObj) {
      var message = _.merge({}, {
        'id': '',
        'type': 'message',
        'channel': 'C1234567',
        'text': ' '
      }, messageObj);

      return this.handleMessage(message).catch(function (err) {
        botLogger.logger.log('Bot: Error handling message %j', err);
      });
    }
  }, {
    key: 'handleMessageEvent',
    value: function handleMessageEvent(message) {
      if (message.type === 'message') {
        var callbackMessage = {
          bot: this.getBotName(),
          message: message.text,
          completeMessage: JSON.stringify(message, internals.jsonReplacer).replace(/\n/g, '\n')
        };

        this.botInterface.emit('message', callbackMessage);
      }
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