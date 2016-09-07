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

const botLogger = require(path.join(root, 'utils/logger'));

const externals = {};
const internals = {};

externals.Commands = class {

  constructor (options) {
    this.context = options.context;
    this.getBotConfig = options.getBotConfig;
    this.getSlackData = options.getSlackData;
    this.getHook = options.getHook;
    this.commandName = options.commandName;
    this.eventStore = options.eventStore;
    this.messageHandler = options.messageHandler;
    this.template = this.getTemplate();

    this.loadEvents();
    return this;
  }

  validate (slackResponse) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        if (!internals.isCommandAllowed(this.getCommand(), slackResponse,
            this.getSlackData().users)) {
          /* jshint ignore:start */
          return onReject({
            restricted_user: true,
            users: this.getCommand().allowedUsers,
            parsedMessage: slackResponse
          });
          /* jshint ignore:end */
        } else if (this.setDefaultParams(this.getCommand(), slackResponse, 0)) {
          return onFulfill();
        }

        var isLimitValid = internals.isLimitValid(this.getCommand(), slackResponse);
        var isAllowedParamValid = internals.isAllowedParamValid(this.getCommand(), slackResponse);

        if (isLimitValid || isAllowedParamValid) {
          return onFulfill();
        } else if (!isLimitValid || !isAllowedParamValid) {
          if (!isLimitValid && this.getCommand().lowerLimit || this.getCommand().upperLimit) {
            return onReject({ limit: true, parsedMessage: slackResponse });
          }
          if (!isAllowedParamValid) {
            return onReject({ param: true, parsedMessage: slackResponse });
          }
        } else if (!internals.isAlertValid(this.getCommand(), slackResponse)) {
          onReject({ alert: true, parsedMessage: slackResponse });
        } else {
          onFulfill();
        }
      }
    });
  }

  respond (parsedMessage) {
    return this.preprocess(parsedMessage)
      .then(() => {
        return this.notify(parsedMessage);
      }).then(() => {
        return this.process(parsedMessage);
      }).catch((err) => {
        botLogger.logger.info('Error processing command ', err);
      });
  }

  notify (response) {
    return Promise.resolve(response);
  }

  message () {
    // Nothing to execute
  }

  loadEvents () {
    var savedEvents = _.values(this.eventStore);
    if (savedEvents) {
      savedEvents.reduce((evPromise, savedEvent) => {
        if (_.get(savedEvent, 'parsedMessage.message.command') === this.commandName) {
          this.reloadCommand(savedEvent.parsedMessage);
        }
      }, Promise.resolve());
    }
  }

  reloadCommand (parsedMessage) {
    this.preprocess(parsedMessage)
      .then(this.process(parsedMessage))
      .catch((err) => {
        botLogger.logger.info('Error processing command ', err);
      });
  }

  quietRespond (parsedMessage) {
    this.process(parsedMessage)
      .catch((err) => {
        botLogger.logger.info('Error processing command ', err);
      });
  }

  typingMessage (parsedMessage) {
    this.messageHandler({
      channels: parsedMessage.channel,
      message: '',
      type: 'typing'
    });
  }

  buildOptions (slackResponse, slackData, purpose) {
    return {
      channel: slackResponse.channel,
      hookUrl: _.get(purpose, 'url', undefined),
      user: _.find(slackData.users, { 'id': slackResponse.user })
    };
  }

  setDefaultParams (command, slackResponse, level) {
    var param = internals.getParams(slackResponse, level);
    if (!param && param !== 0 && command.defaultParamValue) {
      slackResponse.message.params = slackResponse.message.params || [];
      slackResponse.message.params[level] = command.defaultParamValue;
      return true;
    }
    return false;
  }

  getHookContext (purpose, channel, command) {
    let hookContext = {};
    if (purpose && purpose.id) {
      hookContext[purpose.id] = {};
      hookContext[purpose.id].channel = channel;
      hookContext[purpose.id].command = command;
    }
    return hookContext;
  }

  getParams (slackResponse, level) {
    return internals.getParams(slackResponse, level);
  }

  getCommand (commandName) {
    commandName = commandName || this.commandName;
    return this.getBotConfig().botCommand[commandName];
  }

  getTemplate () {
    var template = this.getBotConfig().botCommand[this.commandName].template;
    try {
      template = template ? template() : undefined;
    } catch (err) {
      botLogger.logger.error('Command: make sure to pass a compiled handlebar template', err);
    }
    return template;
  }

  getTimer (parsedMessage) {
    return _.get(this.eventStore, parsedMessage.channel + '_' + this.commandName + '.timer');
  }

  setTimer (parsedMessage, callback) {
    if (this.getTimer(parsedMessage)) {
      clearInterval(this.getTimer(parsedMessage));
    }
    _.set(this.eventStore,
      parsedMessage.channel + '_' + this.commandName + '.timer', callback);
  }
};

internals.getParams = function (slackResponse, level) {
  if (_.get(slackResponse, 'message.params', []).length) {
    if (!_.isNaN(parseInt(slackResponse.message.params[level], 10))) {
      return parseInt(slackResponse.message.params[level], 10);
    }
    return _.get(slackResponse, 'message.params['+ level +']');
  }
};

internals.isAllowedParamValid = function (command, slackResponse) {
  if (_.isEmpty(command.allowedParam)) {
    return false;
  }
  if (_.nth(command.allowedParam, 0) === '*' ||
    _.includes(command.allowedParam, internals.getParams(slackResponse, 0))) {
    return true;
  }
  // assuming that limit is not defined.
  return false;
};

internals.isLimitValid = function (command, slackResponse) {
  if (!command.lowerLimit && !command.upperLimit) {
    return false;
  }

  var responseParam = internals.getParams(slackResponse, 0);
  if (responseParam >= 0) {
    var lowerLimit = parseInt(command.lowerLimit, 10) || 0;
    var upperLimit = parseInt(command.upperLimit, 10) || 0;
    if (_.isNaN(responseParam) || responseParam < lowerLimit || responseParam > upperLimit) {
      return false;
    }
    return true;
  }
  // assuming that limit is not defined.
  return false;
};

internals.isCommandAllowed = function (command, slackResponse, users) {
  if (command && command.allowedUsers) {
    var currentUser = _.find(users, { 'id': slackResponse.user });
    if (currentUser) {
      return _.includes(command.allowedUsers, currentUser.id) ||
        _.includes(command.allowedUsers, currentUser.name);
    }
    return true;
  }
  return true;
};

module.exports = externals.Commands;
