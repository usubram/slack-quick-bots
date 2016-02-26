/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2015 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const handlebars = require('handlebars');

const errorFilePath = path.join(__dirname, '../template/error.hbs');
const helpFilePath = path.join(__dirname, '../template/help.hbs');
const alertFilePath = path.join(__dirname, '../template/alert.hbs');
const errorTemplate = handlebars.compile(fs.readFileSync(errorFilePath, 'utf8'));
const helpTemplate = handlebars.compile(fs.readFileSync(helpFilePath, 'utf8'));
const alertTemplate = handlebars.compile(fs.readFileSync(alertFilePath, 'utf8'));

const internals = {
  commandTypes: ['data', 'recursive', 'kill', 'alert'],
  alertParams: ['setup', 'sample']
};

exports = module.exports = internals.errorHandler = function (botCommand, botName) {
  this.botCommand = botCommand;
  this.botName = botName;
};

internals.errorHandler.prototype.generateErrorTemplate = function (context) {
  var commandContext = this.getContextualErrorResponse(context);
  if(_.isEmpty(commandContext)) {
    commandContext = this.getCommonErrorResponse(context)
  }
  var data = {
    command: commandContext,
    prefix: this._isDirectMessage(context.message.parsedMessage) ? '' : this.botName
  };
  return errorTemplate(data);
}

internals.errorHandler.prototype.getContextualErrorResponse = function (context) {
  var commandName = context.message.parsedMessage.message.command;
  var param = context.message.parsedMessage.message.params ? context.message.parsedMessage.message.params[0] : '';
  return _.reduce(_.filter(this.botCommand,
    function (n, key) {
      return key === commandName;
    }), function (item, value, key) {
      item[commandName] = value;
      item[commandName].name = commandName;
      item[commandName].inContext = true;
      if (internals.commandTypes[3] === commandName &&
        internals.alertParams[0] === param) {
        item[commandName].alertContext = true;
      }
      return item;
    },
  {});
};

internals.errorHandler.prototype.getCommonErrorResponse = function (context) {
  return _.reduce(this.botCommand, function (item, value, key) {
    item[key] = value;
    item[key].name = key;
    if (value.allowedParam && value.allowedParam.length) {
      item[key].aParam = value.allowedParam[0];
    }
    if (value.lowerLimit || value.upperLimit) {
      item[key].aLimit = value.upperLimit || value.lowerLimit;
    }
    return item;
  }, {});
};

internals.errorHandler.prototype._isDirectMessage = function (parsedMessage) {
  return _.startsWith(parsedMessage.channel, 'D', 0);
};

internals.errorHandler.prototype._isPublicMessage = function (parsedMessage) {
  return _.startsWith(parsedMessage.channel, 'C', 0);
};

internals.errorHandler.prototype.generateAlertResponseTemplate = function (context) {
  return alertTemplate(context);
};

internals.errorHandler.prototype.generateBotResponseTemplate = function (context) {
  return helpTemplate(context);
};
