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
const socketServer = require(path.join(root, 'bot/socket-server'));

var Socket = class {
  constructor (botInfo) {
    botInfo.ws = new WebSocketPlugin(botInfo.slackData.url);
    return this.registerEvents(botInfo);
  }

  registerEvents (botInfo) {
    botInfo.botName = _.get(botInfo, 'slackData.self.name');
    botInfo.id = _.get(botInfo, 'slackData.self.id');
    this.onMessageEvent.call(botInfo, botInfo.ws);
    this.onClose.call(botInfo, botInfo.ws)

    return Promise.resolve(this.onSocketOpenEvent.call(botInfo, botInfo.ws));
  }

  onMessageEvent (ws) {
    ws.on('message', (data) => {
      let slackMessage = '';
      try {
        slackMessage = JSON.parse(data);
      } catch (err) {
        botLogger.logger.error('Bot: slack message is not goood', data);
      }
      /* jshint ignore:start */
      if (slackMessage &&
          slackMessage.type === 'message' &&
          slackMessage.reply_to !== '' &&
          !slackMessage.subtype) {
        this.handleMessage(slackMessage);
      }
      /* jshint ignore:end */
    });
  }

  onSocketOpenEvent (ws) {
    return Promise.resolve({
      then: (onFulfill) => {
        ws.on('open', () => {
          if (!this.command) {
            this.command = this.loadCommands();
          }
          this.wsPingPongTimmer = setInterval(() => {
            try {
              this.dispatchMessage({
                  channels: '',
                  message: '',
                  type: 'ping'
                }, (err) => {
                  if (err) {
                    this.connectionManager.reconnect(this);
                  }
                });
            } catch (err) {
              botLogger.logger.info('Bot: ping pong error', err);
              if (this.wsPingPongTimmer) {
                botLogger.logger.debug('Bot: connection closed on ping pong', _.get(this, 'botName'));
                clearInterval(this.wsPingPongTimmer);
                this.connectionManager.reconnect(this);
              }
            }
          }, 2000);
          onFulfill();
        });
      }
    });
  }

  onClose (ws) {
    ws.on('close', () => {
      if (this.wsPingPongTimmer) {
        clearInterval(this.wsPingPongTimmer);
      }
      botLogger.logger.info('Bot: connection closed for', this.botName);
      this.connectionManager.reconnect(this);
    });
  }

  closeConnection (botInfo) {
    botInfo.shutdown = true;
    botInfo.ws.close();
  }
};

module.exports = Socket;
