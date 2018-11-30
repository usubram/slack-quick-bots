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

const Data = require(path.join(root, 'command/commands/data'));
const Recursive = require(path.join(root, 'command/commands/recursive'));
const Alert = require(path.join(root, 'command/commands/alert'));
const Kill = require(path.join(root, 'command/commands/kill'));
const Schedule = require(path.join(root, 'command/commands/schedule'));

const externals = {};

/**
*
* Represents the state and events of command factory.
*
*/
externals.CommandFactory = class {
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
  constructor (options) {
    this.options = options;
    this.commandObj = {};

    return this;
  }

  /**
  * Function to create and load command instances.
  * @return {object} Resolves to this instance.
  */
  loadCommands () {
    return _.reduce(this.options.getBotConfig().botCommand,
      (result, command, key) => {
        return this.getCommand({
          context: this.commandObj,
          commandName: key,
          getBotConfig: this.options.getBotConfig,
          getSlackData: this.options.getSlackData,
          getHttpAgent: this.options.getHttpAgent,
          getHook: this.options.getHook,
          getEventStore: this.options.getEventStore,
          messageHandler: this.options.messageHandler,
        }, command.commandType).then((newCommand) => {
          this.commandObj[key] = newCommand;
          return result;
        });
      }, Promise.resolve({})).then((result) => {
        return this.loadEvents();
      })
    .then(() => {
      return this;
    });
  }

  /**
  * Function to create and load command instances.
  * @param {object} options command options.
  * @param {string} commandType command type.
  * @return {string} command command instance.
  */
  getCommand (options, commandType) {
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
    }

    return command;
  }

  /**
  * Function to load persisted recursive/schedule command on bot restart.
  * @return {object} Resolves to loaded commands.
  */
  loadEvents () {
    const savedEvents = _.concat(_.values(this.options.getEventStore()
      .getSchedules()), _.values(this.options.getEventStore().getEvents()));

    if (savedEvents) {
      return savedEvents.reduce((promiseItem, savedEvent) => {
        const command = this.commandObj[_.toUpper(_.get(savedEvent,
          'parsedMessage.message.command'))];
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
  handleMessage (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        let command = this.commandObj[_.get(parsedMessage, 'message.command')];
        if (command) {
          return command.validate(parsedMessage)
            .then(() => {
              return command.typingMessage(parsedMessage);
            })
            .then(() => {
              return command.respond(parsedMessage);
            }).then((response) => {
              onFulfill(response);
            }).catch((err) => {
              onReject(err);
            });
        } else {
          onReject({
            error: true, parsedMessage: parsedMessage,
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
  handleHook (purposeId, requestData) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        const hookInstance = _.head(_.compact(_.map(this.commandObj,
          ['hookContext', purposeId, 'command'].join('.'))));
        const commandModel = _.get(this.commandObj, hookInstance, undefined);

        if (requestData && hookInstance && commandModel) {
          let template = _.get(commandModel, 'command.template', _.noop);
          let renderedData = requestData.text || template(requestData);
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

module.exports = externals.CommandFactory;
