/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2015 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const botLogger = require('./../../utils/logger');
const Events = require('events');
const _ = require('lodash');
const path = require('path');
const handlebars = require('handlebars');
const fs = require('fs');
const EventEmitter = require('events');
const env = require('./../../utils/environment');
const socket = require('./socket');
const ResponseHandler = require('./responseHandler');
const Command = require('./../command/command');
const messageParser = require('./../command/message');
const storage = require('./../storage/storage');

const internals = {};

exports = module.exports = internals.Bot = function (bot) {
  this.config = Object.assign({}, bot);
  this.eventEmitter = new EventEmitter();
  this.command = new Command(this.config.botCommand);
  this.command.eventEmitter = new EventEmitter();
  this.responseHandler = {};
  this.ws = {};
  this.slackData = '';
  this.botName = '';
  this.id = '';

  this._setupBotEvents();
  this._registerEvents();
};

internals.Bot.prototype._setupBotEvents = function () {
  this.eventEmitter.on('attachSocket', (botInfo) => {
    botLogger.logger.info('Bot: attaching ws event for', botInfo.slackData.self.name);
    this.ws = botInfo.ws;
    this.command.slackData = botInfo.slackData;
    this.botName = botInfo.slackData.self.name;
    this.id = botInfo.slackData.self.id;
    this.responseHandler = new ResponseHandler(this.config.botCommand, this.botName);

    this._loadEvents();

    /* jshint ignore:start */
    this.ws.on('message', (data) => {
      var slackMessage = JSON.parse(data);
      if (slackMessage &&
          slackMessage.type === 'message' &&
          slackMessage.reply_to !== '' &&
          !slackMessage.subtype) {
        this._handleMessage(slackMessage);
      }
    });
    /* jshint ignore:end */

    this.ws.on('open', () => {
      this.reconnection = false;
      this.wsPingPongTimmer = setInterval(() => {
        try {
          this._dispatchMessage('', '', 'ping', (err) => {
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
};

internals.Bot.prototype._loadEvents = function () {
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
};

internals.Bot.prototype._handleMessage = function (message) {
  var parsedMessage = messageParser.parse(message, this.responseHandler._isDirectMessage(message));

  if (this.id === parsedMessage.message.commandPrefix) {
    parsedMessage.message.commandPrefix = _.camelCase(this.botName);
  }

  if (this.config.blockDirectMessage && !this.responseHandler._isPublicMessage(message)) {
    this._dispatchMessage(parsedMessage.channel,
      this.responseHandler.generateBotResponseTemplate(
        {
          parsedMessage: parsedMessage,
          channels: [parsedMessage.channel],
          message: {
            bot_direct_message_error: true
          }
        }
      ));
    return;
  }

  if (this.responseHandler._isDirectMessage(message) ||
    _.camelCase(this.botName) === parsedMessage.message.commandPrefix) {

    this.command.validateCommand(parsedMessage, (validationResult, context) => {
      if (validationResult) {

        this.typingMessage(parsedMessage);

        this.command.respondToCommand(parsedMessage);

      } else {
        this.handleErrorMessage(this.botName, context, parsedMessage);
      }
    });
  }
};

internals.Bot.prototype._dispatchMessage = function (channels, message, type, callback) {
  channels = _.isArray(channels) ? channels : [channels];
  _.forEach(channels, (channel) => {
    if (_.isFunction(callback)) {
      this.ws.send(JSON.stringify({
        'id': '',
        'type': type || 'message',
        'channel': channel,
        'text': '' + message
      }, internals.jsonReplacer).replace(/\n/g, '\n'), callback);
    } else {
      this.ws.send(JSON.stringify({
        'id': '',
        'type': type || 'message',
        'channel': channel || '',
        'text': '' + message
      }, internals.jsonReplacer).replace(/\n/g, '\n'));
    }
  });
};

internals.Bot.prototype.typingMessage = function (message) {
  this._dispatchMessage(message.channel, '', 'typing');
};

internals.Bot.prototype.handleErrorMessage = function (botName, context, parsedMessage) {
  if (_.camelCase(botName) === parsedMessage.message.commandPrefix) {
    this._dispatchMessage(context.parsedMessage.channel,
      this.responseHandler.generateErrorTemplate(context));
  } else {
    /*
    D indicates direct message. Bothering with error response
    in a group or channel may not be a pleasant experience
    without an explicit help command.
    */
    if (_.startsWith(context.parsedMessage.channel, 'D', 0)) {
      this._dispatchMessage(context.parsedMessage.channel,
        this.responseHandler.generateErrorTemplate(context));
    }
  }
};

internals.Bot.prototype._registerEvents = function () {

  this.command.eventEmitter.on('command:setup:alert', (context) => {
    internals.persistEvent(this.botName, context);
    this._dispatchMessage(context.parsedMessage.channel,
      this.responseHandler.generateBotResponseTemplate(context));
  });

  this.command.eventEmitter.on('command:setup:recursive', (context) => {
    internals.persistEvent(this.botName, context);
    this._dispatchMessage(context.parsedMessage.channel,
      this.responseHandler.generateBotResponseTemplate(context));
  });

  this.command.eventEmitter.on('command:recursive:kill', (context) => {
    internals.removeRequest(this.botName, context);
    this._dispatchMessage(context.parsedMessage.channel,
      this.responseHandler.generateBotResponseTemplate(context));
  });

  this.command.eventEmitter.on('command:data:respond', (context) => {
    this._dispatchMessage(context.channels, context.message.data);
  });

  this.command.eventEmitter.on('command:alert:respond', (context) => {
    this._dispatchMessage(context.channels,
      this.responseHandler.generateAlertResponseTemplate(context));
  });

  this.command.eventEmitter.on('command:alert:sample', (context) => {
    this._dispatchMessage(context.channels,
      this.responseHandler.generateAlertResponseTemplate(context));
  });
};

internals.jsonReplacer = function (key, value) {
  if (value && key === "text") {
    return value.replace(/\n|\t/g, '').replace(/\\n/g, '\n');
  }
  return value;
}

internals.persistEvent = function (botName, message) {
  storage.updateEvents(botName, 'event', message);
}

internals.removeRequest = function (botName, message) {
  storage.removeEvents(botName, 'event', message);
}
