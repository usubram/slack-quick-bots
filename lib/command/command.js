/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2017 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const _ = require('lodash');
const path = require('path');
const root = '..';

const logger = require(path.join(root, 'utils/logger'));

const externals = {};
const internals = {};

/**
*
* Represents the state and events of command.
*
*/
externals.Commands = class {
  /**
  * Creates a new Alert instance.
  * @param {object} options command config.
  * @param {object} options.context command context.
  * @param {function} options.getBotConfig function to get bot config.
  * @param {function} options.getSlackData function to get slack data.
  * @param {function} options.getHttpAgent function to get http proxy agent.
  * @param {function} options.getHook function to get command hook.
  * @param {function} options.getEventStore function to get event store.
  * @param {function} options.messageHandler function to dispatch message.
  * @return {object} instance of this.
  * @class
  */
  constructor (options) {
    this.context = options.context;
    this.getBotConfig = options.getBotConfig;
    this.getSlackData = options.getSlackData;
    this.getHttpAgent = options.getHttpAgent;
    this.getHook = options.getHook;
    this.commandName = options.commandName;
    this.getEventStore = options.getEventStore;
    this.messageHandler = options.messageHandler;
    this.template = this.getTemplate();

    this.loadEvents();

    return this;
  }

  /**
  * Function to validate message for command.
  *
  * @param {object} slackResponse Message returned @link command/message.js.
  * @return {object} Promise resolves to success or failure.
  * @override
  */
  validate (slackResponse) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        if (!internals.isCommandAllowed(this.getCommand(),
            slackResponse,
            this.getSlackData())) {
          /* jshint ignore:start */
          return onReject({
            restricted_user: true,
            users: this.getCommand().allowedUsers,
            parsedMessage: slackResponse,
          });
          /* jshint ignore:end */
        } else if (this.setDefaultParams(this.getCommand(),
            slackResponse, 0)) {
          return onFulfill();
        }

        const isLimitValid = internals.isLimitValid(this.getCommand(),
          slackResponse);
        const isAllowedParamValid = internals.isAllowedParamValid(
          this.getCommand(), slackResponse);

        if (isLimitValid || isAllowedParamValid) {
          return onFulfill();
        } else if (!isLimitValid || !isAllowedParamValid) {
          if (!isLimitValid && this.getCommand().lowerLimit || this.getCommand()
            .upperLimit) {
            return onReject({
              limit: true,
              parsedMessage: slackResponse,
            });
          }
          if (!isAllowedParamValid) {
            return onReject({
              param: true,
              parsedMessage: slackResponse,
            });
          }
        } else if (!internals.isAlertValid(this.getCommand(),
            slackResponse)) {
          onReject({
            alert: true,
            parsedMessage: slackResponse,
          });
        } else {
          onFulfill();
        }
      },
    });
  }

  /**
  * Function to respond to command message.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @return {object} Promise resolves to success or failure.
  */
  respond (parsedMessage) {
    return this.preprocess(parsedMessage)
      .then(() => {
        return this.setEvent(parsedMessage);
      }).then(() => {
        return this.notify(parsedMessage);
      }).then(() => {
        return this.process(parsedMessage);
      }).catch((err) => {
        logger.error('Error processing command ', err);
      });
  }

  /**
  * Function to notify to command message.
  *
  * @param {object} response message to dispatch to bot.
  * @return {object} Promise resolves to success or failure.
  */
  notify (response) {
    return Promise.resolve(response);
  }

  /**
  * Function placeholder to message for command.
  *
  * @param {object} response message to dispatch to bot.
  */
  message () {
    // Nothing to execute
  }

  /**
  * Function to load persisted recursive/schedule command on bot restart.
  */
  loadEvents () {
    const savedEvents = _.concat(_.values(this.getEventStore().getSchedules()),
      _.values(this.getEventStore().getEvents()));

    if (savedEvents) {
      savedEvents.reduce((evPromise, savedEvent) => {
        let savedCommand = _.toUpper(_.get(savedEvent,
          'parsedMessage.message.command'));
        if (savedCommand === this.getCommandName()) {
          this.reloadCommand(savedEvent.parsedMessage);
        }
      }, Promise.resolve());
    }
  }

  /**
  * Function to reload persisted event.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  */
  reloadCommand (parsedMessage) {
    this.preprocess(parsedMessage)
      .then(this.process(parsedMessage))
      .then((parsedMessage) => {
        return Promise.resolve(parsedMessage);
      })
      .catch((err) => {
        logger.error('Error processing command ', err);
      });
  }

  /**
  * Function to quiet respond on reloading persisted event.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  */
  quietRespond (parsedMessage) {
    this.process(parsedMessage)
      .catch((err) => {
        logger.error('Error processing command ', err);
      });
  }

  /**
  * Function to handle set timer.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @return {object} Promise resolves to success or failure.
  */
  setEvent (parsedMessage) {
    return this.getEventStore().update('events', {
      parsedMessage: parsedMessage,
      channels: [parsedMessage.channel],
    }).then(() => parsedMessage);
  }

  /**
  * Function to send typing event.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  */
  typingMessage (parsedMessage) {
    this.messageHandler({
      channels: parsedMessage.channel,
      message: '',
      type: 'typing',
    });
  }

  /**
  * Function to build options to data handler.
  *
  * @param {object} slackResponse slack message.
  * @param {object} slackData slack data.
  * @param {object} purpose hook purpose data.
  * @return {object}
  */
  buildOptions (slackResponse, slackData, purpose) {
    return {
      channel: slackResponse.channel,
      hookUrl: _.get(purpose, 'url', undefined),
      user: _.find(slackData.members, {
        'id': slackResponse.user,
      }),
    };
  }

  /**
  * Function to set default params.
  *
  * @param {object} command command instance.
  * @param {object} slackResponse slack response.
  * @param {object} level argument level.
  * @return {object} Returns true/false.
  */
  setDefaultParams (command, slackResponse, level) {
    const param = internals.getParams(slackResponse, level);

    if (!param && param !== 0 && command.defaultParamValue) {
      slackResponse.message.params = slackResponse.message.params || [];
      slackResponse.message.params[level] = command.defaultParamValue;
      return true;
    }

    return false;
  }

  /**
  * Function to get hook context.
  *
  * @param {object} purpose hook instance.
  * @param {string} channel channel id.
  * @param {object} command command instance.
  * @return {object} Hook context
  */
  getHookContext (purpose, channel, command) {
    let hookContext = {};

    if (purpose && purpose.id) {
      hookContext[purpose.id] = {};
      hookContext[purpose.id].channel = channel;
      hookContext[purpose.id].command = command;
    }

    return hookContext;
  }

  /**
  * Function to get command params from message.
  *
  * @param {object} slackResponse slack response.
  * @param {object} level argument level.
  * @return {string} argument value.
  */
  getParams (slackResponse, level) {
    return internals.getParams(slackResponse, level);
  }

  /**
  * Function to get command by name.
  *
  * @param {string} commandName command name.
  * @return {object} command instance.
  */
  getCommand (commandName) {
    return this.getBotConfig().botCommand[this.getCommandName(commandName)];
  }

  /**
  * Function to get current command name.
  *
  * @param {string} commandName command name. Optional.
  * @return {string} command name.
  */
  getCommandName (commandName) {
    return _.toUpper(commandName || this.commandName);
  }

  /**
  * Function to get current command's template.
  *
  * @return {object} handlebar template.
  */
  getTemplate () {
    let template = this.getBotConfig()
      .botCommand[this.getCommandName()].template;

    try {
      template = template || '';
    } catch (err) {
      logger.error('Make sure to pass a compiled handlebar template', err);
    }

    return template;
  }

  /**
  * Function to handle set timer for alert command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @param {object} path path of timer.
  * @param {object} timeInterval time interval to call quietRespond.
  */
  setTimer (parsedMessage, path, timeInterval) {
    const timer = this.getTimer(parsedMessage, path);
    if (timer) {
      clearInterval(timer);
    }

    if (!_.get(this.getEventStore().get(), path)) {
      _.set(this.getEventStore().get(), path, setInterval(() => {
        this.quietRespond(parsedMessage);
      }, timeInterval));
    }
  }

  /**
  * Function to get timer for command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @param {object} path path of timer.
  *
  * @return {object} Timer instance.
  */
  getTimer (parsedMessage, path) {
    return _.get(this.getEventStore().get(), path);
  }
};

internals.getParams = function (slackResponse, level) {
  if (_.get(slackResponse, 'message.params', []).length) {
    if (!_.isNaN(parseInt(slackResponse.message.params[level], 10))) {
      return parseInt(slackResponse.message.params[level], 10);
    }

    return _.get(slackResponse, 'message.params[' + level + ']');
  }
};

internals.isAllowedParamValid = function (command, slackResponse) {
  if (_.isEmpty(command.allowedParam)) {
    return false;
  }

  const allowedParams = _.map(command.allowedParam, _.toUpper);
  const param = _.toUpper(internals.getParams(slackResponse, 0));

  if (_.nth(command.allowedParam, 0) === '*' || _.includes(allowedParams,
      param)) {
    return true;
  }
  // assuming that limit is not defined.
  return false;
};

internals.isLimitValid = function (command, slackResponse) {
  if (!command.lowerLimit && !command.upperLimit) {
    return false;
  }

  const responseParam = internals.getParams(slackResponse, 0);
  if (responseParam >= 0) {
    const lowerLimit = parseInt(command.lowerLimit, 10) || 0;
    const upperLimit = parseInt(command.upperLimit, 10) || 0;

    if (_.isNaN(responseParam) || responseParam < lowerLimit || responseParam >
      upperLimit) {
      return false;
    }
    return true;
  }
  // assuming that limit is not defined.
  return false;
};

internals.isCommandAllowed = function (command, slackResponse, slackData) {
  if (command && command.allowedUsers) {
    const currentUser = _.find(slackData.members, {
      'id': slackResponse.user,
    });

    if (currentUser) {
      return _.includes(command.allowedUsers, currentUser.id) ||
        _.includes(command.allowedUsers, currentUser.name) ||
        internals.validateGroup(currentUser,
          command.allowedUsers, slackData.usergroups);
    }

    return true;
  }

  return true;
};

internals.validateGroup = function (currentUser, allowedUsers, usergroups) {
  if (usergroups) {
    const filteredUserGroup = _.flatten(_.map(allowedUsers,
      function (allowedUser) {
        return _.find(usergroups, {
          'handle': allowedUser,
        });
      }
    ));

    return _.includes(filteredUserGroup, currentUser.id);
  }

  return false;
};

module.exports = externals.Commands;
