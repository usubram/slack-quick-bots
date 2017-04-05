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
const url = require('url');
const WebSocketPlugin = require('ws');
const HttpsProxyAgent = require('https-proxy-agent');
const root = '..';

const logger = require(path.join(root, 'utils/logger'));

var Socket = class {
  constructor (slackData, options) {

    this.slackData = slackData;

    this.proxy = options.proxy;
    this.socketEventEmitter = options.socketEventEmitter;

    this.botName = _.get(this.slackData, 'self.name');
    this.id = _.get(this.slackData, 'self.id');

    this.isShutdown = false;
    this.ignoreStartupMessage = false;

    return this.registerSocketEvents(options);
  }

  connectSocket () {
    return Promise.resolve({
      then: ((onFulfill, onReject) => {
        try {
          let opts;
          let agent;
          const proxy = _.get(this, 'proxy');

          if (proxy && proxy.url) {
            opts = url.parse(this.proxy.url);
            opts.secureEndpoint = proxy.secure ? proxy.secure : false;
            agent = new HttpsProxyAgent(opts);
          }

          if (agent) {
            this.ws = new WebSocketPlugin(this.slackData.url, { agent });
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

  registerSocketEvents () {
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

          let slackMessage = '';

          try {
            slackMessage = JSON.parse(data);
          } catch (err) {
            logger.error('Invalid slack data ', data);
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

        this.ws.on('error', (err) => {
          logger.error('Socket connection errored-out due to ', err);
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
};

module.exports = Socket;
