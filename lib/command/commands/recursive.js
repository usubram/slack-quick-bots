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

const logger = require(path.join(root, '../utils/logger'));
const Command = require(path.join(root, 'command'));
const responseHandler = require(path.join(root, '../bot/response-handler'));

const externals = {};

externals.Recursive = class extends Command {
  constructor (options) {
    super(options);
    return this;
  }

  preprocess (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill) => {
        let time = this.getParams(parsedMessage, 0);
        time = _.isNumber(time) ? time : 1;

        if (this.getCommand().timeUnit === 'h') {
          time = time * 3600000;
        } else {
          time = time * 60000; // default to minute
        }

        this.setTimer(parsedMessage,
          setInterval(() => {
            this.quietRespond(parsedMessage);
          }, time));

        onFulfill(parsedMessage);
      }
    });
  }

  process (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        this.callback = (data) => {
          onFulfill(this.message.bind(this, parsedMessage)(data));
        };

        try {
          this.getCommand().data.apply(this, [{
            command: parsedMessage.message.command,
            params: parsedMessage.message.params
          },
            this.buildOptions(parsedMessage, this.getSlackData(), this.purpose),
            this.callback ]);
        } catch (err) {
          logger.error('Command: error calling handler,' +
            'make sure to pass a proper function', err, err.stack);
          return onReject(err);
        }
      }
    });
  }

  notify (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill) => {
        this.messageHandler({
          channels: parsedMessage.channel,
          message: responseHandler.generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            /* jshint ignore:start */
            recursive_success: true,
            /* jshint ignore:end */
          })
        });
        onFulfill();
      }
    });
  }

  message (parsedMessage, data) {
    if (data && this.getCommand().responseType || _.get(data, 'type')) {
      responseHandler.processFile({
        channels: [parsedMessage.channel],
        message: {
          data: data,
          commandName: parsedMessage.message.command,
          config: this.getCommand().responseType
        }
      }, this.getBotConfig().botToken, this.getHttpAgent());
    } else if (data && _.isFunction(this.template)) {
      try {
        this.messageHandler({
          channels: [parsedMessage.channel],
          message: this.template(data)
        });
      } catch (err) {
        logger.error('Command: make sure to pass a' +
          'compiled handlebar template', err, err.stack);
      }
    }
  }
};

module.exports = externals.Recursive;
