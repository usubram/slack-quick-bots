'use strict';

// Load modules
import * as lodash from 'lodash-es';

import logger from '../utils/logger.js';
import {
  isPublicMessage,
  isPrivateMessage,
  isDirectMessage,
} from '../bot/response-handler.js';

const {
  find,
  get,
  compact,
  zipWith,
  toUpper,
  unset,
  set,
  trim,
  includes,
  filter,
  values,
  map,
  join,
  isEmpty,
  cloneDeep,
  orderBy,
  merge,
  assign,
  isArray,
  isRegExp,
  last,
  first,
  pick,
  isFunction,
  nth,
  some,
  indexOf,
  toString,
  flatten,
  isUndefined,
  isNull,
} = lodash;
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
   * Creates a new Command instance.
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
  constructor(options) {
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
  validate(slackResponse) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        if (
          !this.isCommandAllowed(
            this.getCommand(),
            slackResponse,
            this.getSlackData()
          )
        ) {
          /* jshint ignore:start */
          return onReject({
            restrictedUser: true,
            users: this.getCommand().allowedUsers,
            parsedMessage: slackResponse,
          });
          /* jshint ignore:end */
        }

        if (!this.isAllowedChannel(this.getCommand(), slackResponse)) {
          /* jshint ignore:start */
          return onReject({
            restrictedChannel: true,
            channels: this.getCommand().allowedChannels,
            parsedMessage: slackResponse,
          });
          /* jshint ignore:end */
        }

        const blockDirectMessage = this.shouldBlockDirectMessage(
          this.getCommand(),
          slackResponse
        );
        if (blockDirectMessage) {
          /* jshint ignore:start */
          return onReject({
            softReject: true,
            blockDirectMessage,
          });
          /* jshint ignore:end */
        }

        const allowedParamValid = this.validateCommandArgs(
          this.getCommand(),
          slackResponse
        );

        if (allowedParamValid.isNoop || allowedParamValid.isValid) {
          return onFulfill(allowedParamValid);
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
   * @param {object} validationResult Result of the successfull input validation.
   * @return {object} Promise resolves to success or failure.
   */
  respond(parsedMessage, validationResult) {
    return this.preprocess(parsedMessage, validationResult)
      .then(() => {
        return this.setEvent(parsedMessage);
      })
      .then(() => {
        return this.notify(parsedMessage);
      })
      .then(() => {
        return this.process(parsedMessage);
      })
      .catch((err) => {
        logger.error('Error processing command ', err);
      });
  }

  /**
   * Function to notify to command message.
   *
   * @param {object} response message to dispatch to bot.
   * @return {object} Promise resolves to success or failure.
   */
  notify(response) {
    return Promise.resolve(response);
  }

  /**
   * Function placeholder to message for command.
   *
   * @param {object} response message to dispatch to bot.
   */
  message() {
    // Nothing to execute
  }

  /**
   * Function to reload persisted event.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @return {object} Promise resolves to success or failure.
   */
  reloadCommand(parsedMessage) {
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
  quietRespond(parsedMessage) {
    this.process(parsedMessage).catch((err) => {
      logger.error('Error processing command ', err);
    });
  }

  /**
   * Function to handle set timer.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @return {object} Promise resolves to success or failure.
   */
  setEvent(parsedMessage) {
    return this.getEventStore()
      .update(
        {
          eventType: 'events',
        },
        {
          parsedMessage: parsedMessage,
          channels: [parsedMessage.channel],
        }
      )
      .then(() => parsedMessage);
  }

  /**
   * Function to send typing event.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   */
  typingMessage(parsedMessage) {
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
  buildOptions(slackResponse, slackData, purpose) {
    const user = find(slackData.members, {
      id: slackResponse.user,
    });

    return {
      channel: slackResponse.channel,
      hookUrl: get(purpose, 'url'),
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
  setDefaultParams(defaultValues, slackResponse) {
    const param = compact(getParams(slackResponse, null, true));

    if (defaultValues) {
      const assignedDefault = zipWith(param, defaultValues, (a, b) => {
        return a || b;
      });

      return assignedDefault.length > 0 ? assignedDefault : [defaultValues];
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
  getHookContext(purpose, channel, command) {
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
  getParams(slackResponse, level) {
    return getParams(slackResponse, level);
  }

  /**
   * Function to get command by name.
   *
   * @param {string} commandName command name.
   * @return {object} command instance.
   */
  getCommand(commandName) {
    return this.getBotConfig().botCommand[this.getCommandName(commandName)];
  }

  /**
   * Function to get current command name.
   *
   * @param {string} commandName command name. Optional.
   * @return {string} command name.
   */
  getCommandName(commandName) {
    return toUpper(commandName || this.commandName);
  }

  /**
   * Function to get current command's template.
   *
   * @return {object} handlebar template.
   */
  getTemplate() {
    let template =
      this.getBotConfig().botCommand[this.getCommandName()].template;

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
  setTimer(parsedMessage, path, timeInterval) {
    const timer = this.getTimer(parsedMessage, path);

    if (timer) {
      clearInterval(timer);
      unset(this.getEventStore().get(), path);
    }

    if (!get(this.getEventStore().get(), path)) {
      set(
        this.getEventStore().get(),
        path,
        setInterval(() => {
          this.quietRespond(parsedMessage);
        }, timeInterval)
      );
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
  getTimer(parsedMessage, path) {
    return get(this.getEventStore().get(), path);
  }

  /**
   * Function to filter and return scheduled events.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @return {object} Scheduled events.
   */
  getScheduledEvents(parsedMessage) {
    const currentCommand = this.getCommand(
      this.getCommandName(this.commandName)
    );
    const channel = get(parsedMessage, 'channel');
    const options = trim(this.getParams(parsedMessage, 1));
    const isPublicRequest = isPublicMessage(parsedMessage);
    const isPrivateRequest = isPrivateMessage(parsedMessage);
    const isDirectRequest = isDirectMessage(parsedMessage);
    const events = includes(['ALERT', 'RECURSIVE'], currentCommand.commandType)
      ? this.getEventStore().getEvents()
      : this.getEventStore().getSchedules();

    const allowedEvents = filter(values(events), (item) => {
      const isSameChannel = get(item, 'parsedMessage.channel') === channel;
      const isSchedule = !!get(item, 'parsedMessage.scheduleId');
      const isSameUser =
        get(item, 'parsedMessage.user') === get(parsedMessage, 'user');
      const isPublicSchedule = isSchedule
        ? isPublicMessage(item.parsedMessage)
        : false;

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

    return map(allowedEvents, (item) => {
      const context = {
        user: get(item, 'parsedMessage.user'),
        command: join(get(item, 'parsedMessage.message.params'), ' '),
        channel: get(item, 'parsedMessage.channel'),
        private: !isPublicMessage(get(item, 'parsedMessage')),
        scheduleId: get(item, 'parsedMessage.scheduleId'),
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
  isScheduleList(parsedMessage) {
    return SCHEDULE_COMMAND.LIST === this.getParams(parsedMessage, 0);
  }

  /**
   * Function to validate allowed command arguments.
   *
   * @param {object} command command instance.
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @return {boolean}
   */
  validateCommandArgs(command, parsedMessage) {
    const result = {
      isNoop: false,
      isValid: false,
      isMultiParam: false,
      failedParams: {},
    };

    if (isEmpty(command.validation)) {
      result.isNoop = true;
      return result;
    }

    if (getParams(parsedMessage, 0) === 'HELP') {
      result.isValid = false;
      return result;
    }

    const commandValidations = cloneDeep(
      command.commandType === 'FLOW'
        ? this.getFlowValidations(parsedMessage)
        : command.validation
    );

    const validationResult = compact(
      orderBy(
        map(commandValidations, (rule) => {
          let validationResultValue = 0;
          let noOfErrors = 0;

          const defaultParams = this.setDefaultParams(
            rule.default,
            parsedMessage
          );

          return merge(
            {},
            rule,
            {
              help: map(
                rule.schema,
                (schema, index) => {
                  const inputParam = defaultParams[index] || ' ';
                  const help = assign({}, rule.help[index]);
                  const position = index + 1;

                  if (isArray(schema)) {
                    result.isMultiParam = true;
                    help.result = this.validateArgument(schema, inputParam);
                  } else if (isRegExp(schema)) {
                    result.isMultiParam = true;
                    help.result = this.validateArgument(schema, inputParam);
                  } else {
                    help.result = this.validateArgument(schema, inputParam);
                  }

                  validationResultValue += help.result.failed
                    ? rule.schema.length - position
                    : 0;
                  noOfErrors += Number(help.result.failed);

                  if (noOfErrors === 0 && rule.preset) {
                    help.preset = true;
                  }

                  return help;
                },
                []
              ),
            },
            { validationResultValue, noOfErrors }
          );
        }),
        (order) => order.validationResultValue
      )
    );

    const validResult = filter(
      validationResult,
      (result) => result.noOfErrors === 0
    );

    result.isPresetValid = validResult.filter((item) => item.preset);
    result.isValid = validResult.length > 0;

    const targetError =
      command.commandType === 'FLOW'
        ? last(validationResult)
        : first(validationResult);

    if (!result.isValid) {
      merge(result, {
        noOfErrors: get(targetError, 'noOfErrors'),
        cause: pick(targetError, ['schema', 'help']),
        failedParams: compact(
          map(targetError.help, (item) => {
            if (item.result.failed && !isEmpty(trim(item.result.input))) {
              const error = item.error({
                arg: item.result.input,
              });
              return {
                error: isFunction(item.error) ? error : item.error,
              };
            } else if (item.result.failed) {
              return {
                error: ['Err!! you are missing another argument'],
              };
            }
          })
        ),
      });
    } else {
      parsedMessage.message.params = this.setDefaultParams(
        nth(validResult || []).default,
        parsedMessage
      );
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
  validateArgument(schema, input) {
    const result = {
      input,
      failed: true,
    };

    if (isRegExp(schema) && schema.test(input)) {
      result.failed = false;
      return result;
    }

    if (
      isArray(schema) &&
      some(schema, (item) => {
        return isRegExp(item) && item.test(input);
      })
    ) {
      result.failed = false;
      return result;
    }

    const op1 = indexOf(map(schema, toUpper), toString(toUpper(input)));
    const op2 = indexOf(schema, input);
    const op3 = toUpper(schema) === toUpper(input);

    if (op1 > -1 || op2 > -1 || op3) {
      result.failed = false;
      return result;
    }

    return result;
  }

  /**
   * Function to validate if a command is allowed.
   *
   * @param {object} command command instance.
   * @param {object} slackResponse Message returned @link command/message.js.
   * @param {object} slackData slack RTM response data.
   * @return {boolean}
   */
  isCommandAllowed(command, slackResponse, slackData) {
    if (command && command.allowedUsers) {
      return (
        includes(command.allowedUsers, slackResponse.user) ||
        this.validateGroup(
          slackResponse.user,
          command.allowedUsers,
          slackData.usergroups
        )
      );
    }

    return true;
  }

  /**
   * Function to validate if a command is allowed in a channel.
   *
   * @param {object} command command instance.
   * @param {object} slackResponse Message returned @link command/message.js.
   * @return {boolean}
   */
  isAllowedChannel(command, slackResponse) {
    if (command && command.allowedChannels) {
      return includes(command.allowedChannels, slackResponse.channel);
    }

    return true;
  }

  /**
   * Function to validate if a command is allowed for DM.
   *
   * @param {object} command command instance.
   * @param {object} slackResponse Message returned @link command/message.js.
   * @return {boolean}
   */
  shouldBlockDirectMessage(command, slackResponse) {
    if (
      command &&
      command.blockDirectMessage &&
      isDirectMessage(slackResponse)
    ) {
      return command.blockDirectMessage;
    }

    return false;
  }

  /**
   * Function to validate if a command for a user group.
   *
   * @param {string} currentUser current user id.
   * @param {array} allowedUsers list of users allowed to use the command.
   * @param {array} usergroups slack user group.
   * @return {boolean}
   */
  validateGroup(currentUser, allowedUsers, usergroups) {
    if (usergroups) {
      const filteredUserGroup = flatten(
        map(allowedUsers, function (allowedUser) {
          return find(usergroups, {
            handle: allowedUser,
          });
        })
      );

      return includes(filteredUserGroup, currentUser);
    }

    return false;
  }
};

const getParams = function (slackResponse, level, realValue = false) {
  const paramsLen = get(slackResponse, 'message.params', []).length;
  if (!paramsLen && (isUndefined(level) || isNull(level))) {
    return [];
  }

  if (paramsLen) {
    if (level === 'last') {
      level = paramsLen === 1 ? 0 : paramsLen - 1;
    }

    if (isUndefined(level) || isNull(level)) {
      if (realValue) {
        return get(slackResponse, 'message.params', []);
      }

      return map(get(slackResponse, 'message.params', [], toUpper));
    }

    if (realValue) {
      return get(slackResponse, 'message.params[' + level + ']');
    }

    return toUpper(get(slackResponse, 'message.params[' + level + ']'));
  }
};

export { Command };
