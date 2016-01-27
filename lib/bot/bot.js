'use strict';

// Load modules
const botLogger = require('./../../utils/logger');
const _ = require('lodash');
const path = require('path');
const handlebars = require('handlebars');
const fs = require('fs');
const EventEmitter = require('events');
const socket = require('./socket');
const Command = require('./../command/command');
const Message = require('./../command/message');

const filePath = path.join(__dirname, '../template/error.hbs');
const helpFilePath = path.join(__dirname, '../template/help.hbs');
const errorTemplateSrc = fs.readFileSync(filePath, 'utf8');
const helpTemplateSrc = fs.readFileSync(helpFilePath, 'utf8');

const internals = {};

exports = module.exports = internals.Bot = function (bot) {
  this.config = Object.assign({}, bot);
  this.eventEmitter = new EventEmitter();

  this._init();
};

internals.Bot.prototype._init = function () {
  this.command = new Command(this.config.botCommand);

  this._setupWsEvents();
};

internals.Bot.prototype._setupWsEvents = function () {

  this.eventEmitter.on('attachSocket', (botInfo) => {

    botLogger.logger.info('Bot: attaching ws event for', botInfo.slackData.self.name);
    this.ws = botInfo.ws;
    this.slackData = botInfo.slackData;
    this.botName = botInfo.slackData.self.name;
    this.id = botInfo.slackData.self.id;

    /* jshint ignore:start */
    this.ws.on('message', (data) => {
      var slackMessage = JSON.parse(data);
      if (slackMessage &&
          slackMessage.type === 'message' &&
          slackMessage.reply_to !== '' &&
          !slackMessage.subtype) {
        this._handleMessage.apply(this, [slackMessage]);
      }
    });
    /* jshint ignore:end */

    this.ws.on('open', () => {
      this.reconnection = false;
      var wsPingPongTimmer = setInterval(() => {
        try {
          this._dispatchMessage(this.ws, '', '', 'ping', (err) => {
            if (err) {
              socket.reconnect(this);
            }
          });
        } catch (err) {
          botLogger.logger.info('Bot: ping pong error', err);
          if (wsPingPongTimmer) {
            clearInterval(wsPingPongTimmer);
            botLogger.logger.info('Bot: connection closed on ping pong', botInfo.botName);
            socket.reconnect(this);
          }
        }
      }, 2000);
    });

    this.ws.on('close', () => {
      botLogger.logger.info('Bot: connection closed for', this.botName);
      socket.reconnect(this);
    });
  });
};

internals.Bot.prototype._handleMessage = function (message) {
  var parsedMessage = Message.parse(message, this._isDirectMessage(message));

  if (this.id === parsedMessage.message.commandPrefix) {
    parsedMessage.message.commandPrefix = _.camelCase(this.botName);
  }

  if (this.config.blockDirectMessage && !this._isPublicMessage(message)) {
    this._respondWithHelpForCommand(parsedMessage, 'bot_direct_message_error');
    return;
  }

  if (this._isDirectMessage(message) ||
    _.camelCase(this.botName) === parsedMessage.message.commandPrefix) {

    this.command.validateCommand(parsedMessage, (validationResult, errorContext) => {
      if (validationResult) {

        this._typingMessage.apply(this, [parsedMessage]);
        this.command.eventEmitter = new EventEmitter();

        this.command.eventEmitter.once('botResponse', (context) => {
          this._respondWithHelpForCommand(parsedMessage, context);
        });

        this.command.respondToCommand(parsedMessage, (response) => {
          if (response) {
            this._dispatchMessage(this.ws, parsedMessage.channel, response);
          }
        });
      } else {
        if (_.camelCase(this.botName) === parsedMessage.message.commandPrefix) {
          this._respondWithHelp(parsedMessage, {});
        } else {
          this._respondWithError(parsedMessage, errorContext);
        }
      }
    });
  }
};

internals.Bot.prototype._typingMessage = function (message) {
  var parsedMessage = Message.parse(message, false);
  this._dispatchMessage(this.ws, parsedMessage.channel, '', 'typing');
};

internals.Bot.prototype._respondWithHelp = function (parsedMessage, context) {
  this._dispatchMessage(this.ws,
    parsedMessage.channel,
    this._generateErrorTemplate(parsedMessage, context));
};

internals.Bot.prototype._respondWithHelpForCommand = function (parsedMessage, context) {
  this._dispatchMessage(this.ws,
    parsedMessage.channel,
    this._generateBotResponseTemplate(parsedMessage, context));
};

internals.Bot.prototype._respondWithError = function (parsedMessage, context) {
  /*
    D indicates direct message. Bothering with error response 
    in a group or channel may not be a pleasant experience 
    without an explicit help command.
  */
  if (_.startsWith(parsedMessage.channel, 'D', 0)) {
    this._dispatchMessage(this.ws,
      parsedMessage.channel,
      this._generateErrorTemplate(parsedMessage, context));
  }
};

internals.Bot.prototype._generateErrorTemplate = function (parsedMessage, context) {
  var commandContext = _.reduce(_.filter(this.config.botCommand,
    function (n, key) {
      return key === context.command;
    }), function (item, value) {
      item[context.command] = value;
      return item; 
    },
  {});
  if(_.isEmpty(commandContext)) {
    commandContext = this.config.botCommand;
  }
  var data = {
    command: commandContext,
    prefix: this._isDirectMessage(parsedMessage) ? '' : this.botName
  };
  var template = handlebars.compile(errorTemplateSrc);
  return template(data);
};

internals.Bot.prototype._generateBotResponseTemplate = function (parsedMessage, context) {
  var template = handlebars.compile(helpTemplateSrc);
  var data = {};
  data[context] = true;
  return template(data);
};

internals.Bot.prototype._isDirectMessage = function (parsedMessage) {
  return _.startsWith(parsedMessage.channel, 'D', 0);
};

internals.Bot.prototype._isPublicMessage = function (parsedMessage) {
  return _.startsWith(parsedMessage.channel, 'C', 0);
};

internals.Bot.prototype._dispatchMessage = function (botSocket, channel, message, callback) {
  if (_.isFunction(callback)) {
    botSocket.send(JSON.stringify({
      'id': '',
      'type': 'message',
      'channel': channel, 
      'text': '' + message
    }), callback);
  } else {
    botSocket.send(JSON.stringify({
      'id': '',
      'type': 'message',
      'channel': channel, 
      'text': '' + message
    }));
  }
};
