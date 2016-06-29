/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const handlebars = require('handlebars');

const botLogger = require('./../../lib/utils/logger');
const StreamFile = require('./../../lib/bot/stream-file');

const errorFilePath = path.join(__dirname, '../template/error.hbs');
const helpFilePath = path.join(__dirname, '../template/help.hbs');
const alertFilePath = path.join(__dirname, '../template/alert.hbs');
const errorTemplate = handlebars.compile(fs.readFileSync(errorFilePath, 'utf8'));
const helpTemplate = handlebars.compile(fs.readFileSync(helpFilePath, 'utf8'));
const alertTemplate = handlebars.compile(fs.readFileSync(alertFilePath, 'utf8'));

const externals = {};
const internals = {
  commandTypes: ['data', 'recursive', 'kill', 'alert'],
  alertParams: ['setup', 'sample']
};

externals.ResponseHandler = class {
  constructor (botCommand, botName) {
    this.botCommand = botCommand;
    this.botName = botName;
  }

  generateErrorTemplate (context) {
    var commandContext = this.getContextualErrorResponse(context);
    var renderedTemplate = '';
    if (_.isEmpty(commandContext)) {
      commandContext = this.getCommonErrorResponse();
    }

    var data = {
      command: commandContext,
      /* jshint ignore:start */
      restricted_user: context.restricted_user,
      /* jshint ignore:end */
      users: context.users,
      prefix: this.isDirectMessage(context.parsedMessage) ? '' : this.botName
    };

    try {
      renderedTemplate = context.template ? context.template(data) : errorTemplate(data);
    } catch (err) {
      botLogger.logger.info('Response handler: invalid template', err);
    }

    return renderedTemplate;
  }

  getContextualErrorResponse (context) {
    var commandName = context.parsedMessage.message.command;
    var param = context.parsedMessage.message.params ? context.parsedMessage.message.params[0] : '';
    return _.reduce(_.cloneDeep(_.filter(this.botCommand,
      function (n, key) {
        return key === commandName;
      })), function (item, value) {
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
  }

  getCommonErrorResponse () {
    return _.reduce(this.botCommand, function (item, value, key) {
      item[key] = value;
      item[key].name = key;
      if (value.allowedParam && value.allowedParam.length) {
        item[key].aParam = value.allowedParam[0] === '*' ? '' : value.allowedParam[0];
      }
      if (value.lowerLimit || value.upperLimit) {
        item[key].aLimit = value.upperLimit || value.lowerLimit;
      }
      if (!_.isEmpty(value.helpText)) {
        item[key].helpText = value.helpText;
      }
      return item;
    }, {});
  }

  processFile (context, botToken) {
    context.message.config.botToken = botToken;
    context.message.config.commandName = context.message.commandName;
    new StreamFile(context.channels,
      context.message.data,
      context.message.config).then((response) => {
        if (response.ok !== true) {
          botLogger.logger.error('Resonse handler: responseType result', response);
        }
      }).catch((err) => {
        botLogger.logger.error('Resonse handler: ', err);
      });
  }

  generateAlertResponseTemplate (context) {
    var template = context.template ? context.template() : alertTemplate;
    return template(context.message);
  }

  generateBotResponseTemplate (context) {
    var template = context.template ? context.template() : helpTemplate;
    return template(context.message);
  }

  isDirectMessage (parsedMessage) {
    return _.startsWith(parsedMessage.channel, 'D', 0);
  }
};

internals.isPublicMessage = function (parsedMessage) {
  return _.startsWith(parsedMessage.channel, 'C', 0);
};

module.exports = externals.ResponseHandler;
