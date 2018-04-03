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
const responseHandler = require(path.join(root, 'bot/response-handler'));

const externals = {};
const internals = {};

const SCHEDULE_COMMAND = {
  LIST: 'LIST',
};

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

    return Promise.resolve(this);
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
            restrictedUser: true,
            users: this.getCommand().allowedUsers,
            parsedMessage: slackResponse,
          });
          /* jshint ignore:end */
        }

        this.setDefaultParams(this.getCommand(),
            slackResponse);

        const limitValid = this.isLimitValid(this.getCommand(),
          slackResponse);
        const allowedParamValid = this.isAllowedParamValid(
          this.getCommand(), slackResponse);

        if (limitValid.isValid || allowedParamValid.isValid) {
          return onFulfill();
        } else if (!limitValid.isValid || !allowedParamValid.isValid) {
          if (!limitValid.isNoop && this.getCommand().lowerLimit ||
            this.getCommand().upperLimit) {
            return onReject({
              limit: true,
              parsedMessage: slackResponse,
            });
          }

          if (!allowedParamValid.isNoop && !allowedParamValid.isValid) {
            return onReject({
              param: true,
              mParams: allowedParamValid.isMultiParam,
              failedParams: allowedParamValid.failedParams,
              sampleParams: allowedParamValid.sampleParams,
              noOfErrors: allowedParamValid.noOfErrors,
              parsedMessage: slackResponse,
            });
          }
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
  * Function to reload persisted event.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @return {object} Promise resolves to success or failure.
  */
  reloadCommand (parsedMessage) {
    return this.preprocess(parsedMessage)
      .then(this.process(parsedMessage))
      .then((parsedMessage) => {
        return Promise.resolve(parsedMessage);
      })
      .catch((err) => {
        logger.error('Error processing command ', err);
        return Promise.resolve(parsedMessage);
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
    return this.getEventStore().update({
      eventType: 'events',
    }, {
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
    const user = _.find(slackData.members, {
      id: slackResponse.user,
    });

    return {
      channel: slackResponse.channel,
      hookUrl: _.get(purpose, 'url'),
      user: user || {id: slackResponse.user},
    };
  }

  /**
  * Function to set default params.
  *
  * @param {object} command command instance.
  * @param {object} slackResponse slack response.
  * @param {object} level argument level.
  */
  setDefaultParams (command, slackResponse, level) {
    const param = _.compact(internals.getParams(slackResponse, level));

    slackResponse.message.params = param || [];
    if (_.isArray(command.defaultParamValue)) {
      slackResponse.message.params = _.map(command.defaultParamValue,
        (defaultParam, index) => {
          return slackResponse.message.params[index] || defaultParam;
        });
    } else {
      slackResponse.message.params = param.length > 0 ?
        param : [command.defaultParamValue];
    }
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

  /**
  * Function to filter and return scheduled events.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @return {object} Scheduled events.
  */
  getScheduledEvents (parsedMessage) {
    const currentCommand = this.getCommand(this
      .getCommandName(this.commandName));
    const channel = _.get(parsedMessage, 'channel');
    const options = _.trim(this.getParams(parsedMessage, 1));
    const isPublicRequest = responseHandler.isPublicMessage(parsedMessage);
    const isPrivateRequest = responseHandler.isPrivateMessage(parsedMessage);
    const isDirectRequest = responseHandler.isDirectMessage(parsedMessage);
    const events = currentCommand.commandType === 'ALERT' ? this.getEventStore()
      .getEvents() : this.getEventStore().getSchedules();

    const allowedEvents = _.filter(_.values(events), (item) => {
      const isSameChannel = _.get(item, 'parsedMessage.channel') === channel;
      const isSchedule = !!_.get(item,
        'parsedMessage.scheduleId');
      const isSameUser = _.get(item, 'parsedMessage.user') ===
        _.get(parsedMessage, 'user');
      const isPublicSchedule = isSchedule ?
        responseHandler.isPublicMessage(item.parsedMessage) : false;

      if ((isPublicRequest || isPrivateRequest) && options === 'ALL') {
        return isPublicSchedule;
      } else if (isPublicRequest || isPrivateRequest) {
        return isSchedule && isSameChannel;
      } else if (isDirectRequest && options === 'ALL') {
        return isSchedule && (isSameUser || isPublicSchedule);
      } else if (isDirectRequest) {
        return isSchedule && isSameUser;
      }
    });

    return _.map(allowedEvents, (item) => {
      const context = {
        user: _.get(item, 'parsedMessage.user'),
        command: _.join(_.get(item, 'parsedMessage.message.params'), ' '),
        channel: _.get(item, 'parsedMessage.channel'),
        private: !responseHandler.isPublicMessage(
          _.get(item, 'parsedMessage')),
        scheduleId: _.get(item, 'parsedMessage.scheduleId'),
        botName: this.getEventStore().botName,
      };

      return context;
    });
  }

  /**
  * Function to check if the schedule is for list.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @return {boolean}
  */
  isScheduleList (parsedMessage) {
    return SCHEDULE_COMMAND.LIST === this.getParams(parsedMessage, 0);
  }

  /**
  * Function to validate allowed command arguments.
  *
  * @param {object} command command instance.
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @return {boolean}
  */
  isAllowedParamValid (command, parsedMessage) {
    let result = {
      isNoop: false,
      isValid: false,
      isMultiParam: false,
      failedParams: [],
      sampleParams: [],
    };

    let matchedParams = [];
    if (_.isEmpty(command.allowedParam)) {
      result.isNoop = true;
      return result;
    }

    if (internals.getParams(parsedMessage, 0) === 'HELP') {
      result.isValid = false;
      return result;
    }

    const allowedParams = _.map(command.allowedParam, (allowedParam) => {
      if (_.isArray(allowedParam)) {
        result.isMultiParam = true;
        return _.map(allowedParam, (param) => {
          return _.toString(_.toUpper(param));
        });
      } if (_.isRegExp(allowedParam)) {
        result.isMultiParam = true;
        return allowedParam;
      } else {
        return _.toUpper(allowedParam);
      }
    });

    if (result.isMultiParam) {
      result.sampleParams = _.map(_.get(command, 'paramsHelpMessage'),
        'recommend');
      matchedParams = _.filter(allowedParams, (param, index) => {
        const validationMessage = _.get(command,
          ['paramsHelpMessage', index]);

        const inputParam = internals.getParams(parsedMessage, index);
        if (_.isRegExp(param)) {
          const outcome = param.test(inputParam);

          if (!outcome && validationMessage) {
            result.failedParams.push(_.merge({}, validationMessage, {
              error: _.isFunction(validationMessage.error) ?
                validationMessage.error({
                  arg: inputParam,
                }) : validationMessage.error,
            }));
          }

          return outcome;
        }

        if (!_.includes(param,
            _.toString(inputParam))) {
          if (validationMessage) {
            result.failedParams.push(_.merge({}, validationMessage, {
              error: _.isFunction(validationMessage.error) ?
                validationMessage.error({
                  arg: inputParam,
                }) : validationMessage.error,
            }));
          }

          return false;
        }

        return true;
      });

      if (matchedParams.length === 0 ||
        matchedParams.length !== command.allowedParam.length) {
        result.isValid = false;
      } else {
        result.isValid = true;
      }

      result.noOfErrors = _.get(result, 'failedParams', []).length;

      return result;
    }

    const param = _.toString(internals.getParams(parsedMessage, 0));

    if (_.nth(command.allowedParam, 0) === '*' || _.includes(allowedParams,
        param)) {
      result.isValid = true;
    } else {
      result.isValid = false;
    }

    return result;
  }

  /**
  * Function to validate allowed command arguments.
  *
  * @param {object} command command instance.
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @return {boolean}
  */
  isLimitValid (command, parsedMessage) {
    let result = {
      isNoop: false,
      isValid: false,
    };

    if (!command.lowerLimit && !command.upperLimit) {
      result.isNoop = true;
      return result;
    }

    const responseParam = parseInt(internals
      .getParams(parsedMessage, 0), 10) || 0;
    const lowerLimit = parseInt(command.lowerLimit, 10) || 0;
    const upperLimit = parseInt(command.upperLimit, 10) || 0;

    if (_.isNaN(responseParam) || responseParam < lowerLimit ||
      responseParam > upperLimit) {
      result.isValid = false;
      return result;
    }

    result.isValid = true;
    return result;
  }
};

internals.getParams = function (slackResponse, level) {
  const paramsLen = _.get(slackResponse, 'message.params', []).length;
  if (!paramsLen && _.isUndefined(level)) {
    return [];
  }

  if (paramsLen) {
    if (_.isUndefined(level)) {
      return _.map(_.get(slackResponse, 'message.params', [],
        _.toUpper));
    }

    // if (!_.isNaN(parseInt(slackResponse.message.params[level], 10))) {
    //   return parseInt(slackResponse.message.params[level], 10);
    // }

    return _.toUpper(_.get(slackResponse, 'message.params[' + level + ']'));
  }
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

internals.isAlertValid = function (command, slackResponse) {
  return false;
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
