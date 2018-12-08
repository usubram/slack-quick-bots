/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2018 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const _ = require('lodash');
const path = require('path');
const root = '..';

const logger = require(path.join(root, 'utils/logger'));
const responseHandler = require(path.join(root, 'bot/response-handler'));

const SCHEDULE_COMMAND = {
  LIST: 'LIST',
};

/**
*
* Represents the state and events of command.
*
*/
const Command = class {
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
        if (!isCommandAllowed(this.getCommand(),
          slackResponse, this.getSlackData())) {
          /* jshint ignore:start */
          return onReject({
            restrictedUser: true,
            users: this.getCommand().allowedUsers,
            parsedMessage: slackResponse,
          });
          /* jshint ignore:end */
        }

        if (!isAllowedChannel(this.getCommand(),
          slackResponse)) {
          /* jshint ignore:start */
          return onReject({
            restrictedChannel: true,
            channels: this.getCommand().allowedChannels,
            parsedMessage: slackResponse,
          });
          /* jshint ignore:end */
        }

        const allowedParamValid = this.validateCommandArgs(
          this.getCommand(), slackResponse);

        if (allowedParamValid.isNoop || allowedParamValid.isValid) {
          return onFulfill();
        }

        if (!allowedParamValid.isNoop && !allowedParamValid.isValid) {
          return onReject({
            param: true,
            mParams: allowedParamValid.isMultiParam,
            failedParams: allowedParamValid.failedParams,
            noOfErrors: allowedParamValid.noOfErrors,
            cause: allowedParamValid.cause,
            parsedMessage: slackResponse,
          });
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
      user: user || { id: slackResponse.user },
    };
  }

  /**
  * Function to set default params.
  *
  * @param {object} defaultValues default values in the command instance.
  * @param {object} slackResponse slack response.
  * @return {object} Assigned default values.
  */
  setDefaultParams (defaultValues, slackResponse) {
    const param = _.compact(getParams(slackResponse, null, true));

    if (defaultValues) {
      const assignedDefault = _.zipWith(param, defaultValues, (a, b) => {
        return a || b;
      });

      return assignedDefault.length > 0 ?
        assignedDefault : [defaultValues];
    }

    return param;
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
    const hookContext = {};

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
    return getParams(slackResponse, level);
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
      _.unset(this.getEventStore().get(), path);
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
    const events = _.includes(['ALERT', 'RECURSIVE'],
      currentCommand.commandType) ? this.getEventStore().getEvents() :
      this.getEventStore().getSchedules();

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
  validateCommandArgs (command, parsedMessage) {
    const result = {
      isNoop: false,
      isValid: false,
      isMultiParam: false,
      failedParams: {},
    };

    if (_.isEmpty(command.validation)) {
      result.isNoop = true;
      return result;
    }

    if (getParams(parsedMessage, 0) === 'HELP') {
      result.isValid = false;
      return result;
    }

    const validationResult = _.compact(_.orderBy(_.map(command.validation,
      (rule) => {
        let validationResultValue = 0;
        let noOfErrors = 0;

        const defaultParams = this.setDefaultParams(rule.default,
          parsedMessage);

        return _.merge({}, rule, {
          help: _.map(rule.schema, (schema, index) => {
            const inputParam = defaultParams[index] || ' ';
            const help = _.assign({}, rule.help[index]);
            const position = index + 1;

            if (_.isArray(schema)) {
              result.isMultiParam = true;
              help.result = this.validateArgument(schema, inputParam);
            } else if (_.isRegExp(schema)) {
              result.isMultiParam = true;
              help.result = this.validateArgument(schema, inputParam);
            } else {
              help.result = this.validateArgument(schema, inputParam);
            }

            validationResultValue += help.result.failed ?
              (rule.schema.length - position) : 0;
            noOfErrors += Number(help.result.failed);

            return help;
          }, []),
        }, { validationResultValue, noOfErrors });
      }), (order) => order.validationResultValue));

    const validResult = _.filter(validationResult, (result) =>
      result.noOfErrors === 0);
    result.isValid = validResult.length > 0;

    if (!result.isValid) {
      _.merge(result, {
        noOfErrors: _.get(validationResult,
          [0, 'noOfErrors']),
        cause: _.pick(_.nth(validationResult), ['schema', 'help']),
        failedParams: _.compact(_.map(_.nth(validationResult).help,
          (item, index) => {
            if (item.result.failed && !_.isEmpty(_.trim(item.result.input))) {
              return {
                error: _.isFunction(item.error) ?
                  item.error({
                    arg: item.result.input,
                  }) : item.error,
              };
            } else if (item.result.failed && item.recommend
              && !_.isEmpty(_.trim(item.result.input))) {
              return {
                recommend: _.isArray(item.recommend) ? item.recommend :
                  [`${item.recommend}`],
              };
            } else if (item.result.failed) {
              return {
                error: ['Err!! you are missing another argument'],
              };
            }
          })),
      });
    } else {
      parsedMessage.message.params = this.setDefaultParams(
        _.nth(validResult || []).default, parsedMessage);
    }

    return result;
  }

  /**
  * Utility for validating input arguments.
  *
  * @param {object} schema validation schema.
  * @param {object} input user input.
  * @return {boolean}
  */
  validateArgument (schema, input) {
    const result = {
      input,
      failed: true,
    };

    if (_.isRegExp(schema) && schema.test(input)) {
      result.failed = false;
      return result;
    }

    if (_.isArray(schema) && _.some(schema, (item) => {
      return _.isRegExp(item) && item.test(input);
    })) {
      result.failed = false;
      return result;
    }

    if (_.includes(_.map(schema, _.toUpper),
      _.toString(_.toUpper(input))) ||
      _.includes(schema, input) ||
      _.toUpper(schema) === _.toUpper(input)) {
      result.failed = false;
      return result;
    }

    return result;
  }
};

const getParams = function (slackResponse, level, realValue = false) {
  const paramsLen = _.get(slackResponse, 'message.params', []).length;
  if (!paramsLen && (_.isUndefined(level) || _.isNull(level))) {
    return [];
  }

  if (paramsLen) {
    if (level === 'last') {
      level = paramsLen === 1 ? 0 : paramsLen - 1;
    }

    if (_.isUndefined(level) || _.isNull(level)) {
      if (realValue) {
        return _.get(slackResponse, 'message.params', []);
      }

      return _.map(_.get(slackResponse, 'message.params', [],
        _.toUpper));
    }

    if (realValue) {
      return _.get(slackResponse, 'message.params[' + level + ']');
    }

    return _.toUpper(_.get(slackResponse, 'message.params[' + level + ']'));
  }
};

const isCommandAllowed = function (command, slackResponse, slackData) {
  if (command && command.allowedUsers) {
    return _.includes(command.allowedUsers, slackResponse.user) ||
      validateGroup(slackResponse.user,
        command.allowedUsers, slackData.usergroups);
  }

  return true;
};

const isAllowedChannel = function (command, slackResponse) {
  if (command && command.allowedChannels) {
    return _.includes(command.allowedChannels, slackResponse.channel);
  }

  return true;
};

const validateGroup = function (currentUser, allowedUsers, usergroups) {
  if (usergroups) {
    const filteredUserGroup = _.flatten(_.map(allowedUsers,
      function (allowedUser) {
        return _.find(usergroups, {
          'handle': allowedUser,
        });
      }
    ));

    return _.includes(filteredUserGroup, currentUser);
  }

  return false;
};

module.exports = {
  Command,
};
