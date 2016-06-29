/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var handlebars = require('handlebars');

var botLogger = require('./../../lib/utils/logger');
var StreamFile = require('./../../lib/bot/stream-file');

var errorFilePath = path.join(__dirname, '../template/error.hbs');
var helpFilePath = path.join(__dirname, '../template/help.hbs');
var alertFilePath = path.join(__dirname, '../template/alert.hbs');
var errorTemplate = handlebars.compile(fs.readFileSync(errorFilePath, 'utf8'));
var helpTemplate = handlebars.compile(fs.readFileSync(helpFilePath, 'utf8'));
var alertTemplate = handlebars.compile(fs.readFileSync(alertFilePath, 'utf8'));

var externals = {};
var internals = {
  commandTypes: ['data', 'recursive', 'kill', 'alert'],
  alertParams: ['setup', 'sample']
};

externals.ResponseHandler = function () {
  function _class(botCommand, botName) {
    _classCallCheck(this, _class);

    this.botCommand = botCommand;
    this.botName = botName;
  }

  _createClass(_class, [{
    key: 'generateErrorTemplate',
    value: function generateErrorTemplate(context) {
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
  }, {
    key: 'getContextualErrorResponse',
    value: function getContextualErrorResponse(context) {
      var commandName = context.parsedMessage.message.command;
      var param = context.parsedMessage.message.params ? context.parsedMessage.message.params[0] : '';
      return _.reduce(_.cloneDeep(_.filter(this.botCommand, function (n, key) {
        return key === commandName;
      })), function (item, value) {
        item[commandName] = value;
        item[commandName].name = commandName;
        item[commandName].inContext = true;
        if (internals.commandTypes[3] === commandName && internals.alertParams[0] === param) {
          item[commandName].alertContext = true;
        }
        return item;
      }, {});
    }
  }, {
    key: 'getCommonErrorResponse',
    value: function getCommonErrorResponse() {
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
  }, {
    key: 'processFile',
    value: function processFile(context, botToken) {
      context.message.config.botToken = botToken;
      context.message.config.commandName = context.message.commandName;
      new StreamFile(context.channels, context.message.data, context.message.config).then(function (response) {
        if (response.ok !== true) {
          botLogger.logger.error('Resonse handler: responseType result', response);
        }
      }).catch(function (err) {
        botLogger.logger.error('Resonse handler: ', err);
      });
    }
  }, {
    key: 'generateAlertResponseTemplate',
    value: function generateAlertResponseTemplate(context) {
      var template = context.template ? context.template() : alertTemplate;
      return template(context.message);
    }
  }, {
    key: 'generateBotResponseTemplate',
    value: function generateBotResponseTemplate(context) {
      var template = context.template ? context.template() : helpTemplate;
      return template(context.message);
    }
  }, {
    key: 'isDirectMessage',
    value: function isDirectMessage(parsedMessage) {
      return _.startsWith(parsedMessage.channel, 'D', 0);
    }
  }]);

  return _class;
}();

internals.isPublicMessage = function (parsedMessage) {
  return _.startsWith(parsedMessage.channel, 'C', 0);
};

module.exports = externals.ResponseHandler;