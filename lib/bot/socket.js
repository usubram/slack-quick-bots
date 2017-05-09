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

const logger = require(path.join(root, 'utils/logger'));

var Socket = class {
  constructor (options) {

    this.slackData = {};

    this.agent = options.agent;
    this.socketEventEmitter = options.socketEventEmitter;

    this.isShutdown = false;
    this.ignoreStartupMessage = false;
  }

  connectSocket () {
    return Promise.resolve({
      then: ((onFulfill, onReject) => {
        try {

          if (this.agent) {
            this.ws = new WebSocketPlugin(this.slackData.url, { agent: this.agent });
          } else {
            this.ws = new WebSocketPlugin(this.slackData.url);
          }

          return onFulfill();
        } catch (err) {
          logger.error('Error establishing socket connection due to ', err);
        }

        return onReject();
      })
    });
  }

  setupSocketConnectionEvents (slackData) {
    _.extend(this.slackData, slackData);
    this.botName = _.get(this.slackData, 'self.name');
    this.id = _.get(this.slackData, 'self.id');

    return Promise.all([
      this.connectSocket(),
      this.registerOnMessageEvent(),
      this.registerOnCloseEvent(),
      this.registerOnSocketOpenEvent()
    ]).then((context) => {
      return context[3];
    }).catch((err) => {
      logger.error('Registering socket events failed due to ', err);
    });
  }

  registerOnMessageEvent () {
    return Promise.resolve({
      then: ((onFulfill) => {
        this.ws.on('message', (data) => {

          let slackMessage;

          try {
            slackMessage = JSON.parse(data);
          } catch (err) {
            logger.error('Invalid slack data ', data);
          }

          if (slackMessage) {
            this.routeMessageType(slackMessage);
          }
        });

        this.ws.on('error', (err) => {
          logger.error('Socket connection errored out due to ', err);
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

          logger.info('Bot connection closed for ', this.botName);
        });

        return onFulfill();
      })
    });
  }

  registerOnSocketOpenEvent () {
    return Promise.resolve({
      then: ((onFulfill) => {
        this.ws.on('open', () => {

          logger.info('Socket connection successfully made for ', this.botName);

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
      clearInterval(this.wsPingPongTimmer);

      logger.debug('Socket connection closed during ping for ', _.get(this, 'botName'));
      this.emitEvent('reconnect');
    }
  }

  sendMessage (message, callback) {
    try {
      // TODO: queue the message on failure.
      this.ws.send(message, callback);
    } catch (err) {
      logger.error('Error sending message to slack ', err);
    }
  }

  routeMessageType (message) {
    const messageTypeRegex = new RegExp(/^(\w+)_\w+$|(\w+)$/);
    const regexResponse = messageTypeRegex.exec(message.type);
    const messageType = _.nth(_.compact(regexResponse), 1);

    switch (messageType) {
      case 'message':

        /* jshint ignore:start */
        let isBotMessage = _.isEmpty(message.reply_to) &&
          !message.subtype &&
          this.ignoreStartupMessage;
        /* jshint ignore:end */

        if (isBotMessage) {
          this.emitEvent('message', message);
        }

        break;
      case 'channel':
        this.emitEvent('channel', message);

        break;
      case 'user':
        this.emitEvent('user', message);

        break;
      case 'team':
        this.emitEvent('team', message);

        break;
      case 'presence':
        this.emitEvent('presence', message);

        break;
    }
  }

};

module.exports = Socket;
