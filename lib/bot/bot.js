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
const CommandFactory = require(path.join(root, 'command/command-factory'));
const Hook = require(path.join(root, 'bot/hook'));
const messageParser = require(path.join(root, 'command/message'));
const responseHandler = require(path.join(root, 'bot/response-handler'));
const socket = require(path.join(root, 'bot/socket'));

const internals = {};
const externals = {};

externals.Bot = class {
  constructor (bot) {
    this.config = Object.assign({}, bot);
    this.ws = {};
    this.slackData = '';
    this.botName = '';
    this.hook = {};
    this.id = '';
  }

  setupBotEvents (testEvents) {
    return new Promise((resolve) => {

      botLogger.logger.info('Bot: attaching ws event for', this.slackData.self.name);
      this.botName = this.slackData.self.name;
      this.id = this.slackData.self.id;
      this.hook = this.server ? new Hook(this.id, this.server) : undefined;

      /* jshint ignore:start */
      this.ws.on('message', (data) => {
        let slackMessage = '';
        try {
          slackMessage = JSON.parse(data);
        } catch (err) {
          botLogger.logger.error('Bot: slack message is not goood', data);
        }

        if (slackMessage &&
            slackMessage.type === 'message' &&
            slackMessage.reply_to !== '' &&
            !slackMessage.subtype) {
          this.handleMessage(slackMessage);
        }
      });
      /* jshint ignore:end */

      this.ws.on('open', () => {
        if (!this.command) {
          this.command = this.loadCommands();
        }

        this.reconnection = false;
        this.wsPingPongTimmer = setInterval(() => {
          try {
            this.dispatchMessage({
                channels: '',
                message: '',
                type: 'ping'
              }, (err) => {
                if (err) {
                  socket.reconnect(this);
                }
              });
          } catch (err) {
            botLogger.logger.info('Bot: ping pong error', err);
            if (this.wsPingPongTimmer) {
              // botLogger.logger.info('Bot: connection closed on ping pong', botInfo.botName);
              clearInterval(this.wsPingPongTimmer);
              socket.reconnect(this);
            }
          }
        }, 2000);
        resolve();
      });

      this.ws.on('close', () => {
        if (this.wsPingPongTimmer) {
          clearInterval(this.wsPingPongTimmer);
        }
        botLogger.logger.info('Bot: connection closed for', this.botName);
        if (!this.shutdown) {
          this.shutdown = false;
          socket.reconnect(this);
        }
      });

      if (testEvents) {
        _.set(this, 'events.input', (message) => {
          return new Promise((resolve) => {
            this.ws.send(message);
            _.set(this, 'events.output', resolve);
          });
        });
      }
    });
  }

  handleMessage (message) {
    var parsedMessage = messageParser.parse(message, responseHandler.isDirectMessage(message));
    if (this.id === parsedMessage.message.commandPrefix) {
      parsedMessage.message.commandPrefix = _.camelCase(this.botName);
    }
    if (this.config.blockDirectMessage && !responseHandler.isPublicMessage(message)) {
      this.dispatchMessage({
        channels: parsedMessage.channel,
        message: responseHandler.generateBotResponseTemplate({
          parsedMessage: parsedMessage,
          channels: [parsedMessage.channel],
          message: {
            /* jshint ignore:start */
            bot_direct_message_error: true
            /* jshint ignore:end */
          }
        })
      });
      return;
    }

    if (responseHandler.isDirectMessage(message) ||
      _.camelCase(this.botName) === parsedMessage.message.commandPrefix) {
      this.command.handleMessage(parsedMessage).then((response) => {
        if (_.isFunction(_.get(this, 'events.output'))) {
          _.get(this, 'events.output')(response);
        }
      }).catch((err) => {
        this.handleErrorMessage(this.botName, err);
        if (_.isFunction(_.get(this, 'events.output'))) {
          _.get(this, 'events.output')(this.handleErrorMessage(this.botName, err));
        }
      });
      return;
    }
    if (_.isFunction(_.get(this, 'events.output'))) {
      _.get(this, 'events.output')();
    }
  }

  loadCommands () {
    return new CommandFactory({
      getBotConfig: () => {
        return this.config;
      },
      getSlackData: () => {
        return this.slackData;
      },
      getHook: () => {
        return this.hook;
      },
      messageHandler: (options, callback) => {
        this.dispatchMessage(options, callback);
      }
    });
  }

  handleHookRequest (purposeId, data, response) {
    this.command.handleHook(purposeId, data, response).then((cmdResponse) => {
      this.dispatchMessage(cmdResponse);
      response.end('{ "response": "ok" }');
    }).catch((errResponse) => {
      response.end(JSON.stringify(errResponse));
    });
  }

  dispatchMessage (options, callback) {
    callback = _.isFunction(callback) ? callback : undefined;
    options.channels = _.isArray(options.channels) ? options.channels : [options.channels];
    _.forEach(options.channels, (channel) => {
      try {
        this.ws.send(JSON.stringify({
          'id': '',
          'type': options.type || 'message',
          'channel': channel,
          'text': '' + options.message
        }, internals.jsonReplacer).replace(/\n/g, '\n'), callback);
      } catch (err) {
        botLogger.logger.error('Bot: socket connection error', err);
      }
    });
  }

  handleErrorMessage (botName, context) {
    var message = responseHandler.generateErrorTemplate(botName, this.config.botCommand, context);
    this.dispatchMessage({
      channels: context.parsedMessage.channel,
      message: message
    });
    return message;
  }

};

internals.jsonReplacer = function (key, value) {
  if (value && key === 'text') {
    return value.replace(/\n|\t/g, '').replace(/\\n/g, '\n');
  }
  return value;
};

module.exports = externals.Bot;
