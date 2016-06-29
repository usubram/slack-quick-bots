/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const botLogger = require('./../../lib/utils/logger');
const _ = require('lodash');
const EventEmitter = require('events');
const socket = require('./socket');
const ResponseHandler = require('./response-handler');
const Command = require('./../command/command');
const messageParser = require('./../command/message');
const storage = require('./../storage/storage');
const Hook = require('./hook');

const internals = {};
const externals = {};

externals.Bot = class {
  constructor (bot) {
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

  setupBotEvents () {
    this.eventEmitter.on('attachSocket', (botInfo) => {
      botLogger.logger.info('Bot: attaching ws event for', botInfo.slackData.self.name);
      this.ws = botInfo.ws;
      this.command.slackData = botInfo.slackData;
      this.botName = botInfo.slackData.self.name;
      this.id = botInfo.slackData.self.id;

      if (this.server) {
        this.command.hook = new Hook(this.id, this.server);
      }

      this.responseHandler = new ResponseHandler(this.config.botCommand, this.botName);

      this.loadEvents();

      /* jshint ignore:start */
      this.ws.on('message', (data) => {
        var slackMessage = JSON.parse(data);
        if (slackMessage &&
            slackMessage.type === 'message' &&
            slackMessage.reply_to !== '' &&
            !slackMessage.subtype) {
          this.handleMessage(slackMessage);
        }
      });
      /* jshint ignore:end */

      this.ws.on('open', () => {
        this.reconnection = false;
        this.wsPingPongTimmer = setInterval(() => {
          try {
            this.dispatchMessage({
                channels: '',
                message: '',
                type: 'ping'
              }, (err) => {
                if (err) {
                  socket.reconnect(this);
                }
              });
          } catch (err) {
            botLogger.logger.info('Bot: ping pong error', err);
            if (this.wsPingPongTimmer) {
              clearInterval(this.wsPingPongTimmer);
              botLogger.logger.info('Bot: connection closed on ping pong', botInfo.botName);
              socket.reconnect(this);
            }
          }
        }, 2000);
      });

      this.ws.on('close', () => {
        if (this.wsPingPongTimmer) {
          clearInterval(this.wsPingPongTimmer);
        }
        botLogger.logger.info('Bot: connection closed for', this.botName);
        if (!this.shutdown) {
          this.shutdown = false;
          socket.reconnect(this);
        }
      });

    });

    this.eventEmitter.on('hookCast', (purposeId, data, response, callback) => {
      this.command.sendResponseToHook(purposeId, data, response, callback);
    });
  }

  loadEvents () {
    storage.getEvents('events').then((eventsData) => {
      var savedEvents = _.values(eventsData[this.botName]);
      if (savedEvents && savedEvents.length) {
        savedEvents.reduce((evPromise, savedEvent) => {
          return this.command.loadCommand(savedEvent.parsedMessage).then( function (done) {
            if (done) {
              botLogger.logger.info('Successfully loaded event:', savedEvent);
            }
          });
        }, Promise.resolve());
      }
    });
  }

  handleMessage (message) {
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

    if (this.responseHandler.isDirectMessage(message) ||
      _.camelCase(this.botName) === parsedMessage.message.commandPrefix) {

      this.command.validateCommand(parsedMessage, (err) => {
        if (err) {
          this.handleErrorMessage(this.botName, err);
        } else {
          this.typingMessage(parsedMessage);
          this.command.respondToCommand(parsedMessage);
        }
      });
    }
  }

  dispatchMessage (options, callback) {
    callback = _.isFunction(callback) ? callback : undefined;
    options.channels = _.isArray(options.channels) ? options.channels : [options.channels];
    _.forEach(options.channels, (channel) => {
      try {
        this.ws.send(JSON.stringify({
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

  typingMessage (message) {
    this.dispatchMessage({
      channels: message.channel,
      message: '',
      type: 'typing'
    });
  }

  handleErrorMessage (botName, context) {
    this.dispatchMessage({
      channels: context.parsedMessage.channel,
      message: this.responseHandler.generateErrorTemplate(context)
    });
  }

  registerEvents () {
    this.command.eventEmitter.on('command:setup:alert', (context) => {
      internals.persistEvent(this.botName, context);
      this.dispatchMessage({
        channels: context.parsedMessage.channel,
        message: this.responseHandler.generateBotResponseTemplate(context)
      });
    });

    this.command.eventEmitter.on('command:setup:recursive', (context) => {
      internals.persistEvent(this.botName, context);

      this.dispatchMessage({
        channels: context.parsedMessage.channel,
        message: this.responseHandler.generateBotResponseTemplate(context)
      });
    });

    this.command.eventEmitter.on('command:recursive:kill', (context) => {
      internals.removeRequest(this.botName, context);
      this.dispatchMessage({
        channels: context.parsedMessage.channel,
        message: this.responseHandler.generateBotResponseTemplate(context)
      });
    });

    this.command.eventEmitter.on('command:data:respond', (context) => {
      this.dispatchMessage({
        channels: context.channels,
        message: context.message.data
      });
    });

    this.command.eventEmitter.on('command:data:file', (context) => {
      this.responseHandler.processFile(context, this.config.botToken);
    });

    this.command.eventEmitter.on('command:alert:respond', (context) => {
      this.dispatchMessage({
        channels: context.channels,
        message: this.responseHandler.generateAlertResponseTemplate(context)
      });
    });

    this.command.eventEmitter.on('command:alert:sample', (context) => {
      this.dispatchMessage({
        channels: context.channels,
        message: this.responseHandler.generateAlertResponseTemplate(context)
      });
    });

    this.command.eventEmitter.on('command:hook:respond', (context) => {
      this.dispatchMessage({
        channels: context.channels,
        message: context.data.hook
      });
    });
  }
};

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
