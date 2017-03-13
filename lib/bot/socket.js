/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const _ = require('lodash');
const path = require('path');
const WebSocketPlugin = require('ws');
const root = '..';

const botLogger = require(path.join(root, 'utils/logger'));

var Socket = class {
  constructor (slackData, options) {
    this.isShutdown = false;
    this.slackData = slackData;
    this.ws = new WebSocketPlugin(this.slackData.url);
    this.botName = _.get(this.slackData, 'self.name');
    this.id = _.get(this.slackData, 'self.id');
    this.socketEventEmitter = options.socketEventEmitter;

    this.ignoreStartupMessage = false;

    return this.registerSocketEvents(options);
  }

  registerSocketEvents () {
    return Promise.all([
      this.registerOnMessageEvent(),
      this.registerOnCloseEvent(),
      this.registerOnSocketOpenEvent()
    ]).then((result) => {
      return result[2];
    }).catch((err) => {
      botLogger.logger.error('Socket: registerEvents failed with', err);
    });
  }

  registerOnMessageEvent () {
    return Promise.resolve({
      then: ((onFulfill) => {
        this.ws.on('message', (data) => {

          let slackMessage = '';

          try {
            slackMessage = JSON.parse(data);
          } catch (err) {
            botLogger.logger.error('Socket: slack message is not good', data);
          }

          /* jshint ignore:start */
          if (slackMessage &&
              slackMessage.type === 'message' &&
              _.isEmpty(slackMessage.reply_to) &&
              !slackMessage.subtype &&
              this.ignoreStartupMessage) {
            this.emitEvent('message', slackMessage);
          }
          /* jshint ignore:end */
        });
        return onFulfill();
      })
    });
  }

  registerOnCloseEvent () {
    return Promise.resolve({
      then: ((onFulfill) => {
        this.ws.on('close', () => {

          if (this.isShutdown) {
            this.isShutdown = false;
            this.emitEvent('shutdown');
          } else {
            this.emitEvent('close');
          }

          botLogger.logger.info('Socket: closing bot ', this.botName);
        });
        return onFulfill();
      })
    });
  }

  registerOnSocketOpenEvent () {
    return Promise.resolve({
      then: ((onFulfill) => {
        this.ws.on('open', () => {

          setTimeout(() => {
            this.ignoreStartupMessage = true;
          }, 1000);

          this.wsPingPongTimmer = setInterval(() => {
            try {
              this.emitEvent('ping', {
                channels: '',
                message: '',
                type: 'ping'
              }, (err) => {
                if (err) {
                  this.clearPingPongTimer();
                }
              });
            } catch (err) {
              this.clearPingPongTimer();
            }
          }, 1000);

          return onFulfill(this);
        });
      })
    });
  }

  connectionCloseEvent () {
    if (this.wsPingPongTimmer) {
      clearInterval(this.wsPingPongTimmer);
    }
    botLogger.logger.info('Socket: connection closed for', this.botName);
    this.connectionManager.reconnect(this);
  }

  close () {
    this.ws.close();
  }

  shutdown () {
    this.isShutdown = true;
    this.ws.close();
  }

  getId () {
    return this.id;
  }

  getBotName () {
    return this.botName;
  }

  getSlackData () {
    return this.slackData;
  }

  emitEvent (eventName, ...args) {
    if (this.socketEventEmitter) {
      this.socketEventEmitter.emit(eventName, args);
    }
  }

  clearPingPongTimer () {
    if (this.wsPingPongTimmer) {
      botLogger.logger.info('Socket: connection closed on ping pong', _.get(this, 'botName'));
      clearInterval(this.wsPingPongTimmer);
      this.emitEvent('reconnect');
    }
  }

  sendMessage (message, callback) {
    try {
      // TODO: queue the message on failure.
      this.ws.send(message, callback);
    } catch (err) {
      botLogger.logger.error('Socket: socket connection error', err);
    }
  }
};

module.exports = Socket;
