'use strict';

const _ = require('lodash');
const path = require('path');
const WebSocketPlugin = require('ws');
const root = '..';

const logger = require(path.join(root, 'utils/logger'));

/**
 *
 * Represents the state and events of a socket of a bot.
 *
 */
const Socket = class {
  /**
   * Creates a new Socket instance.
   * @param {object} options Connection options.
   * @param {function} options.socketAgent socket proxy agent.
   * @param {object} options.socketEventEmitter event emitter.
   * @class
   */
  constructor(options) {
    this.slackData = {};

    this.agent = options.agent;
    this.socketEventEmitter = options.socketEventEmitter;

    this.isShutdown = false;
    this.ignoreStartupMessage = false;
  }

  /**
   * Function to make socket connection.
   *
   * @return {Object} Promise object resolves to success or failure.
   */
  connectSocket() {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        try {
          if (this.agent) {
            this.ws = new WebSocketPlugin(this.slackData.url, {
              agent: this.agent,
            });
          } else {
            this.ws = new WebSocketPlugin(this.slackData.url);
          }

          return onFulfill();
        } catch (err) {
          logger.error('Error establishing socket connection due to ', err);
        }

        return onReject();
      },
    });
  }

  /**
   * Function to connect and setup events for socket connection.
   * @param {Object} slackData slack data.
   *
   * @return {Object} Promise object resolves to Socket instance.
   */
  setupSocketConnectionEvents(slackData) {
    _.extend(this.slackData, slackData);
    this.botName = _.get(this.slackData, 'self.name');
    this.id = _.get(this.slackData, 'self.id');

    return Promise.all([
      this.connectSocket(),
      this.registerOnMessageEvent(),
      this.registerOnCloseEvent(),
      this.registerOnSocketOpenEvent(),
    ])
      .then((context) => {
        return context[3];
      })
      .catch((err) => {
        logger.error('Registering socket events failed due to ', err);
      });
  }

  /**
   * Function to register onMessage event.
   *
   * @return {Object} Promise object resolves to success.
   */
  registerOnMessageEvent() {
    return Promise.resolve({
      then: (onFulfill) => {
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
      },
    });
  }

  /**
   * Function to register onClose event.
   *
   * @return {Object} Promise object resolves to success.
   */
  registerOnCloseEvent() {
    return Promise.resolve({
      then: (onFulfill) => {
        this.ws.on('close', () => {
          if (this.isShutdown) {
            this.isShutdown = false;
            this.emitEvent('shutdown');
          } else {
            this.emitEvent('close');
            this.emitEvent('reconnect');
          }

          logger.info('Bot connection closed for ', this.botName);
        });

        return onFulfill();
      },
    });
  }

  /**
   * Function to register onOpen event.
   *
   * @return {Object} Promise object resolves to success.
   */
  registerOnSocketOpenEvent() {
    return Promise.resolve({
      then: (onFulfill) => {
        this.ws.on('open', () => {
          logger.info('Socket connection successfully made for ', this.botName);

          setTimeout(() => {
            this.ignoreStartupMessage = true;
          }, 1000);

          this.wsPingPongTimmer = setInterval(() => {
            try {
              this.emitEvent(
                'ping',
                {
                  channels: '',
                  message: '',
                  type: 'ping',
                },
                (err) => {
                  if (err) {
                    this.clearPingPongTimer();
                  }
                }
              );
            } catch (err) {
              this.clearPingPongTimer();
            }
          }, 1000);

          return onFulfill(this);
        });
      },
    });
  }

  /**
   * Function to close socket connection.
   */
  close() {
    this.ws.close();
  }

  /**
   * Function to shutdown socket connection.
   */
  shutdown() {
    this.isShutdown = true;
    this.ws.close();
  }

  /**
   * Function to get bot id.
   * @return {string} bot id.
   */
  getId() {
    return this.id;
  }

  /**
   * Function to get bot name.
   * @return {string} bot name.
   */
  getBotName() {
    return this.botName;
  }

  /**
   * Function to get slack data.
   * @return {object} slack data.
   */
  getSlackData() {
    return this.slackData;
  }

  /**
   * Function to emit generic event.
   * @param {string} eventName event name.
   * @param {object} args emitter data.
   */
  emitEvent(eventName, ...args) {
    if (this.socketEventEmitter) {
      this.socketEventEmitter.emit(eventName, args);
    }
  }

  /**
   * Function to clear ping pong timer.
   */
  clearPingPongTimer() {
    if (this.wsPingPongTimmer) {
      clearInterval(this.wsPingPongTimmer);

      logger.debug(
        'Socket connection closed during ping for ',
        _.get(this, 'botName')
      );
      this.emitEvent('reconnect');
    }
  }

  /**
   * Function to clear ping pong timer.
   * @param {object} message message to be sent to slack.
   * @param {function} callback function to be called on message sent.
   */
  sendMessage(message, callback) {
    try {
      // TODO: queue the message on failure.
      this.ws.send(message, callback);
    } catch (err) {
      logger.error('Error sending message to slack ', err);
    }
  }

  /**
   * Function to route different message event types from slack.
   * @param {object} message message from slack.
   */
  routeMessageType(message) {
    const messageTypeRegex = new RegExp(/^(\w+)_\w+$|(\w+)$/);
    const regexResponse = messageTypeRegex.exec(message.type);
    const messageType = _.nth(_.compact(regexResponse), 1);

    switch (messageType) {
      case 'message': {
        /* jshint ignore:start */
        const isBotMessage =
          _.isEmpty(message.reply_to) &&
          !message.subtype &&
          this.ignoreStartupMessage;
        /* jshint ignore:end */

        if (isBotMessage) {
          this.emitEvent('message', message);
        }

        break;
      }
      case 'channel': {
        this.emitEvent('channel', message);

        break;
      }
      case 'user': {
        this.emitEvent('user', message);

        break;
      }
      case 'team': {
        this.emitEvent('team', message);

        break;
      }
      case 'presence': {
        this.emitEvent('presence', message);

        break;
      }
    }
  }
};

module.exports = {
  Socket,
};
