'use strict';

// Load modules
import * as lodash from 'lodash-es';
import logger from '../utils/logger.js';
import { Data } from '../command/commands/data.js';
import { Recursive } from '../command/commands/recursive.js';
import { Alert } from '../command/commands/alert.js';
import { Flow } from '../command/commands/flow.js';
import { Kill } from '../command/commands/kill.js';
import { Schedule } from '../command/commands/schedule.js';

const { reduce, concat, values, toUpper, get, head, compact, map, isFunction } =
  lodash;
/**
 *
 * Represents the state and events of command factory.
 *
 */
const CommandFactory = class {
  /**
   * Creates a new Alert instance.
   * @param {object} options command config.
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
    this.options = options;
    this.commandObj = {};

    return this;
  }

  /**
   * Function to create and load command instances.
   * @return {object} Resolves to this instance.
   */
  loadCommands() {
    return reduce(
      this.options.getBotConfig().botCommand,
      (result, command, key) => {
        return this.getCommand(
          {
            context: this.commandObj,
            commandName: key,
            getBotConfig: this.options.getBotConfig,
            getSlackData: this.options.getSlackData,
            getHttpAgent: this.options.getHttpAgent,
            getHook: this.options.getHook,
            getEventStore: this.options.getEventStore,
            messageHandler: this.options.messageHandler,
          },
          command.commandType
        ).then((newCommand) => {
          this.commandObj[key] = newCommand;
          return result;
        });
      },
      Promise.resolve({})
    )
      .then(() => this.loadEvents())
      .then(() => this);
  }

  /**
   * Function to create and load command instances.
   * @param {object} options command options.
   * @param {string} commandType command type.
   * @return {string} command command instance.
   */
  getCommand(options, commandType) {
    let command;

    switch (commandType) {
      case 'ALERT':
        command = new Alert(options);
        break;
      case 'DATA':
        command = new Data(options);
        break;
      case 'KILL':
        command = new Kill(options);
        break;
      case 'RECURSIVE':
        command = new Recursive(options);
        break;
      case 'SCHEDULE':
        command = new Schedule(options);
        break;
      case 'FLOW':
        command = new Flow(options);
        break;
    }

    return command;
  }

  /**
   * Function to load persisted recursive/schedule command on bot restart.
   * @return {object} Resolves to loaded commands.
   */
  loadEvents() {
    const savedEvents = concat(
      values(this.options.getEventStore().getSchedules()),
      values(this.options.getEventStore().getEvents())
    );

    if (savedEvents) {
      return savedEvents.reduce((promiseItem, savedEvent) => {
        const command =
          this.commandObj[
            toUpper(get(savedEvent, 'parsedMessage.message.command'))
          ];
        if (command) {
          return command.reloadCommand(savedEvent.parsedMessage);
        }
      }, Promise.resolve());
    }

    return Promise.resolve({});
  }

  /**
   * Function to handle messages to bot.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @return {object} Promise resolves to response or error.
   */
  handleMessage(parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        const command = this.commandObj[get(parsedMessage, 'message.command')];
        if (command) {
          return command
            .validate(parsedMessage)
            .then((validationResult) => {
              command.typingMessage(parsedMessage);
              return command.respond(parsedMessage, validationResult);
            })
            .then((response) => {
              onFulfill(response);
            })
            .catch((err) => {
              onReject(err);
            });
        } else {
          onReject({
            error: true,
            parsedMessage: parsedMessage,
          });
        }
      },
    });
  }

  /**
   * Function to handle messages to bot.
   *
   * @param {string} purposeId hook request identifier.
   * @param {object} requestData hook request data.
   * @return {object} Promise resolves to response or error.
   */
  handleHook(purposeId, requestData) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        const hookInstance = head(
          compact(
            map(
              this.commandObj,
              ['hookContext', purposeId, 'command'].join('.')
            )
          )
        );
        const commandModel = get(this.commandObj, hookInstance, undefined);
        const template = get(commandModel, 'template');
        let renderedData = requestData ? requestData.text || requestData : '';

        if (requestData && hookInstance && commandModel) {
          try {
            renderedData =
              !requestData.text && isFunction(template)
                ? template(requestData)
                : renderedData;
          } catch (err) {
            logger.error('Error processing hook data ', err);
          }
          onFulfill({
            channels: [commandModel.hookContext[purposeId].channel],
            message: renderedData,
          });
        } else {
          onReject({
            error: 'invalid hook url',
          });
        }
      },
    });
  }
};

export { CommandFactory };
