'use strict';

// Load modules
const _ = require('lodash');
const path = require('path');
const root = '..';

const logger = require(path.join(root, '../utils/logger'));
const { Command } = require(path.join(root, 'command'));
const responseHandler = require(path.join(root, '../bot/response-handler'));

/**
*
* Represents the state and events of a recursive command.
*
*/
const Recursive = class extends Command {
  /**
  * Creates a new Alert instance.
  * @param {object} options command config.
  * @param {object} options.context command context.
  * @param {string} options.commandName command name.
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
    super(options);

    return this;
  }

  /**
  * Function to handle pre-process for recursive command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @override
  */
  preprocess (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill) => {
        let time = Number(this.getParams(parsedMessage, 'last'));
        time = _.isNumber(time) && time > 0 ? time : 1;

        if (this.getCommand().timeUnit === 'h') {
          time = time * 3600000;
        } else {
          time = time * 60000; // default to minute
        }

        this.setTimer(parsedMessage,
          [parsedMessage.channel + '_' + this.getCommandName(), 'timer'], time);

        onFulfill(parsedMessage);
      },
    });
  }

  /**
  * Function to handle process for recursive command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @override
  */
  process (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        this.callback = (err, data) => {
          onFulfill(this.message.bind(this, parsedMessage)(err, data));
        };

        try {
          this.getCommand().data.apply(this, [{
            command: parsedMessage.message.command,
            params: parsedMessage.message.params,
          },
          this.buildOptions(parsedMessage, this.getSlackData(), this.purpose),
          this.callback,
          ]);
        } catch (err) {
          logger.error('Command: error calling handler,' +
            'make sure to pass a proper function', err, err.stack);
          return onReject(err);
        }
      },
    });
  }

  /**
  * Function to handle notify for recursive command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @override
  */
  notify (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill) => {
        this.messageHandler({
          channels: parsedMessage.channel,
          message: responseHandler.generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            /* jshint ignore:start */
            recursiveSuccess: true,
            /* jshint ignore:end */
          }),
          thread: parsedMessage.thread_ts,
        });
        onFulfill();
      },
    });
  }

  /**
  * Function to handle message for recursive command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @param {object} err err from recursive command data handler.
  * @param {object} data result from recursive command data handler.
  * @override
  */
  message (parsedMessage, err, data) {
    if (err) {
      logger.error('data handler returned error', err);
      return;
    }

    if (data && this.getCommand().responseType || _.get(data, 'type')) {
      responseHandler.processFile({
        channels: [parsedMessage.channel],
        message: {
          data: data,
          commandName: parsedMessage.message.command,
          config: this.getCommand().responseType,
        },
      }, this.getBotConfig().botToken, this.getHttpAgent());
    } else if (data && _.isFunction(this.template)) {
      try {
        this.messageHandler({
          channels: [parsedMessage.channel],
          message: this.template(data),
          thread: parsedMessage.thread_ts,
        });
      } catch (err) {
        logger.error('Command: make sure to pass a' +
          'compiled handlebar template', err, err.stack);
      }
    }
  }
};

module.exports = {
  Recursive,
};
