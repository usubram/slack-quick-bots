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
const Data = require(path.join(root, 'command/commands/data'));
const Recursive = require(path.join(root, 'command/commands/recursive'));
const Alert = require(path.join(root, 'command/commands/alert'));
const Kill = require(path.join(root, 'command/commands/kill'));
const Schedule = require(path.join(root, 'command/commands/schedule'));
const storage = require(path.join(root, 'storage/storage'));

const externals = {};

externals.CommandFactory = class {

  constructor (options) {
    this.commandObj = {};
    this.eventStore = {};

    Promise.resolve(storage.getEvents(['events', 'schedule']))
      .then ((eventsData) => {
        this.eventStore = _.get(eventsData, options.getSlackData().self.name, {});
        _.forEach (options.getBotConfig().botCommand, (command, key) => {
          this.commandObj[key] = this.getCommand({
            context: this.commandObj,
            commandName: key,
            getBotConfig: options.getBotConfig,
            getSlackData: options.getSlackData,
            getHook: options.getHook,
            eventStore: this.eventStore,
            messageHandler: options.messageHandler
          }, command.commandType);
        });
      }).catch((err) => {
        botLogger.logger.error('Error loading storage', err);
        _.forEach (options.getBotConfig().botCommand, (command, key) => {
          this.commandObj[key] = this.getCommand({
            context: this.commandObj,
            commandName: key,
            getBotConfig: options.getBotConfig,
            getSlackData: options.getSlackData,
            getHook: options.getHook,
            eventStore: this.eventStore,
            messageHandler: options.messageHandler
          }, command.commandType);
        });
      });
    return this;
  }

  getCommand (options, commandType) {
    let command;
    switch (commandType) {
      case 'alert':
        command = new Alert(options);
        break;
      case 'data':
        command = new Data(options);
        break;
      case 'kill':
        command = new Kill(options);
        break;
      case 'recursive':
        command = new Recursive(options);
        break;
      case 'schedule':
        command = new Schedule(options);
        break;
    }
    return command;
  }

  handleMessage (parsedMessage) {
    return Promise.resolve({ 
      then: (onFulfill, onReject) => {
        let command = this.commandObj[_.get(parsedMessage, 'message.command')];
        if (command) {
          command.validate(parsedMessage)
            .then(() => {
              return command.typingMessage(parsedMessage);
            }).then(() => {
              return command.respond(parsedMessage);
            }).then((response) => {
              onFulfill(response);
            }).catch((err) => {
              onReject(err);
            });
        } else {
          onReject({ error: true, parsedMessage: parsedMessage });
        }
      }
    });
  }

  handleHook (purposeId, requestData) {
    return Promise.resolve({ 
      then: (onFulfill, onReject) => {
        var hookInstance = _.head(_.compact(
          _.map(this.commandObj, ['hookContext', purposeId, 'command'].join('.'))));
        var commandModel = _.get(this.commandObj, hookInstance, undefined);
        if (requestData && hookInstance && commandModel) {
          let template = _.get(commandModel, 'command.template', _.noop);
          let renderedData = requestData.text || template(requestData);
          onFulfill({
            channels: [commandModel.hookContext[purposeId].channel],
            message: renderedData
          });
        } else {
          onReject({ error: 'invalid hook url' });
        }
      }
    });
  }
};

module.exports = externals.CommandFactory;
