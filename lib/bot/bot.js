'use strict';

// Load modules
const _ = require('lodash');
const path = require('path');
const handlebars = require('handlebars');
const fs = require('fs');
const filePath = path.join(__dirname, '../template/error.hbs');
const errorTemplateSrc = fs.readFileSync(filePath, 'utf8');

const Command = require('./../command/command');
const Message = require('./../command/message');

const internals = {};

exports = module.exports = internals.Bot = function (bot) {
  this.bot = Object.assign({}, bot);
  this._init();
};

internals.Bot.prototype._init = function () {
  this.bot.command = new Command(this.bot.botCommand);
};

internals.Bot.prototype.startWebSocketSession = function (botInfo) {
  this.bot.slackData = botInfo.slackData;
  this.bot.botName = botInfo.slackData.self.name;
  this.bot.ws = botInfo.ws;
  this.bot.ws.on('message', (data) => {
    var slackMessage = JSON.parse(data);
    if (slackMessage && slackMessage.type === 'message' && !slackMessage.subtype) {
      this._handleMessage.apply(this, [slackMessage]);
    }
  });
};

internals.Bot.prototype._handleMessage = function (message) {
  var parsedMessage = Message.parse(message, this._isDirectMessage(message));
  if (this._isDirectMessage(message) ||
    _.camelCase(this.bot.botName) === parsedMessage.message.commandPrefix) {
    this.bot.command.validateCommand(parsedMessage, (validationResult, errorContext) => {
      if (validationResult) {
        this._typingMessage.apply(this, [parsedMessage]);
        this.bot.command.respondToCommand(parsedMessage, (response) => {
          if (response) {
            this._dispatchMessage(this.bot.ws, parsedMessage.channel, response);
          }
        });
      } else {
        if (_.camelCase(this.bot.botName) === parsedMessage.message.commandPrefix) {
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
  this._dispatchMessage(this.bot.ws, parsedMessage.channel, '', 'typing');
};

internals.Bot.prototype._respondWithHelp = function (parsedMessage, context) {
  this._dispatchMessage(this.bot.ws,
    parsedMessage.channel,
    this._generateErrorTemplate(parsedMessage, context));
};

internals.Bot.prototype._respondWithError = function (parsedMessage, context) {
  /*
    D indicates direct message. Bothering with error response 
    in a group or channel may not be a pleasant experience 
    without an explicit help command.
  */
  if (_.startsWith(parsedMessage.channel, 'D', 0)) {
    this._dispatchMessage(this.bot.ws,
      parsedMessage.channel,
      this._generateErrorTemplate(parsedMessage, context));
  }
};

internals.Bot.prototype._generateErrorTemplate = function (parsedMessage, context) {
  var commandContext = _.reduce(_.filter(this.bot.botCommand,
    function (n, key) {
      return key === context.command;
    }), function (item, value) {
      item[context.command] = value;
      return item; 
    },
  {});
  if(_.isEmpty(commandContext)) {
    commandContext = this.bot.botCommand;
  }
  var data = {
    command: commandContext,
    prefix: this._isDirectMessage(parsedMessage) ? '' : this.bot.botName
  };
  var template = handlebars.compile(errorTemplateSrc);
  return template(data);
};

internals.Bot.prototype._isDirectMessage = function (parsedMessage) {
  return _.startsWith(parsedMessage.channel, 'D', 0);
};

internals.Bot.prototype._dispatchMessage = function (botSocket, channel, message) {
  botSocket.send(JSON.stringify({
    'id': '',
    'type': 'message',
    'channel': channel, 
    'text': '' + message
  }));
};

