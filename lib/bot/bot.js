/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const _ = require('lodash');
const path = require('path');

const root = '..';

const logger = require(path.join(root, 'utils/logger'));
const BotInterface = require(path.join(root, 'bot/bot-interface'));
const Connector = require(path.join(root, 'bot/connector'));
const CommandFactory = require(path.join(root, 'command/command-factory'));
const EventEmitter = require('events').EventEmitter;
const Hook = require(path.join(root, 'bot/hook'));
const HttpsProxyAgent = require('https-proxy-agent');
const MockConnector = require(path.join(root, 'bot/mock-connector'));
const messageParser = require(path.join(root, 'command/message'));
const storage = require(path.join(root, 'storage/storage'));
const responseHandler = require(path.join(root, 'bot/response-handler'));
const url = require('url');

const internals = {};
const externals = {};

externals.Bot = class {
  constructor (bot) {
    this.config = Object.assign({}, bot);
    this.ws = {};
    this.slackData = '';
    this.hook = {};
    this.eventEmitter = new EventEmitter();
    this.interfaceEventEmitter = new EventEmitter();
    this.botMessageParser = messageParser.parse(
      _.map(_.keys(_.get(this.config, 'botCommand')), _.toUpper));

    this.setupEvents();
    this.setupIntefaceEvents();
  }

  init () {
    if (_.get(this.config, 'mock')) {
      logger.debug('Connecting for bot in mock');
      this.connectionManager = new MockConnector(this.config.botToken, {
        socketEventEmitter: this.eventEmitter,
        mock: _.get(this.config, 'mock')
      });
    } else {
      logger.debug('Setting up connection for bots');
      this.connectionManager = new Connector(this.config.botToken, {
        httpAgent: this.getHttpAgent(),
        socketAgent: this.getSocketAgent(),
        socketEventEmitter: this.eventEmitter
      });
    }

    this.connectionManager.connect().catch((err) => {
      logger.error('Failed to establish connection %j', err);
    });

    this.commandFactory = this.loadCommands();

    return this.botInterface;
  }

  setupEvents () {
    this.eventEmitter.on('close', () => {
      this.botInterface.emit('close');
    }).on('connect', () => {
      this.loadSavedEvents();
    }).on('reconnect', () => {
      this.reconnect();
    }).on('shutdown', () => {
      this.botInterface.emit('shutdown');
    }).on('start', () => {
      this.botInterface.emit('start');
    }).on('ping', (args) => {
      this.dispatchMessage.apply(this, args);
    }).on('message', (args) => {
      this.handleMessage.apply(this, args);
    });
  }

  setupIntefaceEvents () {
    this.interfaceEventEmitter.on('injectMessage', (message) => {
      this.injectMessage(message);
    });

    this.interfaceEventEmitter.on('shutdown', () => {
      this.shutdown();
    });

    this.interfaceEventEmitter.on('restart', () => {
      this.close();
    });

    this.interfaceEventEmitter.on('close', () => {
      this.close();
    });

    this.interfaceEventEmitter.on('start', () => {
      this.start();
    });

    this.botInterface = new BotInterface({
      getBotName: () => {
        return this.getBotName();
      },
      getId: () => {
        return this.getId();
      }
    }, this.interfaceEventEmitter);
  }

  handleMessage (message) {
    var parsedMessage = this.botMessageParser({
      id: this.getId(),
      name: this.getBotName()
    }, message);

    if (this.config.blockDirectMessage && !responseHandler.isPublicMessage(message)) {
      logger.info('processed message ', parsedMessage);
      return this.handleBotMessages(parsedMessage);
    }

    if (responseHandler.isDirectMessage(message) ||
      _.toUpper(this.getBotName()) === parsedMessage.message.commandPrefix ||
      _.toUpper(this.getId()) === parsedMessage.message.commandPrefix) {

      logger.info('processed message ', parsedMessage);

      return this.commandFactory.handleMessage(parsedMessage).catch((err) => {
        return this.handleErrorMessage(this.getBotName(), err);
      });
    }

  }

  loadCommands () {
    return new CommandFactory({
      getBotConfig: () => {
        return this.config;
      },
      getSlackData: () => {
        return this.getSlackData();
      },
      getHttpAgent: () => {
        return this.getHttpAgent();
      },
      getHook: () => {
        return this.hook;
      },
      getEventStore: () => {
        return _.get(this.eventStore, this.getBotName());
      },
      messageHandler: (options, callback) => {
        this.dispatchMessage(options, callback);
      }
    });
  }

  loadSavedEvents () {
    if (this.eventStore) {
      this.botInterface.emit('connect');
    } else {
      storage.getEvents(['events', 'schedule']).then((events) => {
        this.eventStore = events;
        this.commandFactory.loadCommands();
        this.botInterface.emit('connect');
      }).catch((err) => {
        logger.error('Error loading saved event %j', err);
        this.commandFactory.loadCommands();
        this.botInterface.emit('connect');
      });

      this.hook = this.server ? new Hook(this.getId(), this.server) : undefined;
    }
  }

  handleHookRequest (purposeId, data, response) {
    this.commandFactory.handleHook(purposeId, data, response).then((cmdResponse) => {
      this.dispatchMessage(cmdResponse);
      response.end('{ "response": "ok" }');
    }).catch((errResponse) => {
      response.end(JSON.stringify(errResponse));
    });
  }

  dispatchMessage (options, callback) {
    callback = _.isFunction(callback) ? callback : undefined;
    options.channels = _.isArray(options.channels) ?
      options.channels : [options.channels || options.channel];

    _.forEach(options.channels, (channel) => {

      let message = {
        'id': new Date().getTime().toString(),
        'type': options.type || 'message',
        'channel': channel,
        'text': '' + options.message
      };

      try {
        let messageStr = JSON.stringify(message,
          internals.jsonReplacer).replace(/\n/g, '\n');

        this.connectionManager.socket.sendMessage(messageStr, callback);

      } catch (err) {
        logger.error('Error sending message ', err);
      }

      this.handleMessageEvent(message);
    });
  }

  handleErrorMessage (botName, context) {
    let renderedData = responseHandler.generateErrorTemplate(botName,
      this.config.botCommand, context);
    this.dispatchMessage({
      channels: context.parsedMessage.channel,
      message: renderedData
    });

    return Promise.resolve(renderedData);
  }

  handleBotMessages (parsedMessage) {
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

  close () {
    this.connectionManager.close();
  }

  shutdown () {
    this.connectionManager.shutdown();
  }

  start () {
    this.connectionManager.connect().catch((err) => {
      logger.error('Unable to start the bot %j', err);
    });
  }

  reconnect () {
    this.connectionManager.reconnect();
  }

  getId () {
    var socket = _.get(this, 'connectionManager.socket');
    return socket ? socket.getId() : undefined;
  }

  getBotName () {
    var socket = _.get(this, 'connectionManager.socket');
    return socket ? socket.getBotName() : undefined;
  }

  getSlackData () {
    var socket = _.get(this, 'connectionManager.socket');
    return socket ? socket.getSlackData() : undefined;
  }

  injectMessage (messageObj) {
    let message = _.merge({}, {
      'id': '',
      'type': 'message',
      'channel': 'C1234567',
      'text': ' '
    }, messageObj);

    return this.handleMessage(message).catch((err) => {
      logger.error('Unable to inject message %j', err);
    });
  }

  handleMessageEvent (message) {
    if (message.type === 'message') {
      let callbackMessage = {
        bot: this.getBotName(),
        message: message.text,
        completeMessage: JSON.stringify(message,
          internals.jsonReplacer).replace(/\n/g, '\n')
      };

      this.botInterface.emit('message', callbackMessage);
    }
  }

  getSocketAgent () {
    if (!this.socketAgent && this.proxy && this.proxy.url) {
      let opts = url.parse(this.proxy.url);
      opts.secureEndpoint = opts.protocol ? opts.protocol == 'wss:' : false;
      this.socketAgent = new HttpsProxyAgent(opts);
    }

    return this.socketAgent;
  }

  getHttpAgent () {
    if (!this.httpAgent && this.proxy && this.proxy.url) {
      let opts = url.parse(this.proxy.url);
      opts.secureEndpoint = opts.protocol ? opts.protocol == 'https:' : false;
      this.httpAgent = new HttpsProxyAgent(opts);
    }

    return this.httpAgent;
  }

};

internals.jsonReplacer = function (key, value) {
  if (value && key === 'text') {
    return value.replace(/\n|\t/g, '').replace(/\\n/g, '\n');
  }
  return value;
};

module.exports = externals.Bot;
