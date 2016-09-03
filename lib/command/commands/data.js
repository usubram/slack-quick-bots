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

const botLogger = require(path.join(root, '../utils/logger'));
const Command = require(path.join(root, 'command'));
const responseHandler = require(path.join(root, '../bot/response-handler'));

const externals = {};

externals.Data = class extends Command {
  constructor (options) {
    super(options);
    return this;
  }

  preprocess (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        this.template = '';
        this.purpose = this.getHook() ? this.getHook().getHookPurpose(parsedMessage.channel) : '';
        this.hookContext = this.getHookContext(this.purpose,
          parsedMessage.channel,
          parsedMessage.message.command);

        this.setDefaultParams(this.getCommand(), parsedMessage, 0);

        try {
          this.template = this.getCommand().template ? this.getCommand().template() : '';
        } catch (err) {
          botLogger.logger.error('Command: make sure to pass a compiled handlebar template', err);
          return onReject(err);
        }

        onFulfill(parsedMessage);
      }
    });
  }

  process (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        try {
          this.callback = (data) => {
            onFulfill(this.message.bind(this, parsedMessage)(data));
          };
          this.getCommand().data.apply(this, [{
              command: parsedMessage.message.command, params: parsedMessage.message.params
            },
            this.buildOptions(parsedMessage, this.getSlackData(), this.purpose),
              this.callback]);
        } catch (err) {
          botLogger.logger.error('Command: error calling handler,' +
            'make sure to pass a proper function', err, err.stack);
          return onReject(err);
        }
      }
    });
  }

  message (parsedMessage, data) {
    if (this.getCommand().responseType || _.get(data, 'responseType')) {
      responseHandler.processFile({
        channels: [parsedMessage.channel],
        message: {
          data: data,
          commandName: parsedMessage.message.command,
          config: this.getCommand().responseType
        }
      }, this.getBotConfig().botToken);
    } else if (data && _.isFunction(this.template)) {
      try {
        let renderedData = this.template(data);
        this.messageHandler({
          channels: [parsedMessage.channel],
          message: renderedData
        });
        return renderedData;
      } catch (err) {
        botLogger.logger.error('Command: make sure to pass a' +
          'compiled handlebar template', err, err.stack);
      }
    }
  }
};

module.exports = externals.Data;
