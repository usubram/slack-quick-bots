'use strict';

// Load modules
const _ = require('lodash');
const path = require('path');
const root = '..';

const logger = require(path.join(root, '../utils/logger'));
const { Command } = require(path.join(root, 'command'));
const responseHandler = require(path.join(root, '../bot/response-handler'));
const postMessage = require('../../slack-api/post-message');

/**
 *
 * Represents the state and events of a data command.
 *
 */
const Data = class extends Command {
  /**
   * Creates a new Data instance.
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
  constructor(options) {
    super(options);

    return this;
  }

  /**
   * Function to handle pre-process for data command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @override
   */
  preprocess(parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        this.template = '';
        this.purpose = _.isEmpty(this.getHook())
          ? ''
          : this.getHook().getHookPurpose(parsedMessage.channel);
        this.hookContext = this.getHookContext(
          this.purpose,
          parsedMessage.channel,
          parsedMessage.message.command
        );

        try {
          this.template = this.getCommand().template
            ? this.getCommand().template
            : '';
        } catch (err) {
          logger.error(
            'Command: make sure to pass a compiled handlebar template',
            err
          );
          return onReject(err);
        }

        onFulfill(parsedMessage);
      },
    });
  }

  /**
   * Function to handle process for data command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @override
   */
  process(parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        try {
          this.callback = (err, data) => {
            onFulfill(this.message.bind(this, parsedMessage)(err, data));
          };

          const localDataFunction = this.getCommand().data;
          const dataFunctionArguments = [
            {
              command: parsedMessage.message.command,
              params: parsedMessage.message.params,
              files: parsedMessage.files,
            },
            this.buildOptions(parsedMessage, this.getSlackData(), this.purpose),
          ];

          // arity less than 3, assume no callback and a Promise is returned
          if (localDataFunction.length < 3) {
            return localDataFunction
              .apply(this, dataFunctionArguments)
              .then((data) =>
                onFulfill(this.message.bind(this, parsedMessage)(null, data))
              )
              .catch((error) =>
                onFulfill(this.message.bind(this, parsedMessage)(error))
              );
          }

          return localDataFunction.apply(
            this,
            dataFunctionArguments.concat(this.callback)
          );
        } catch (err) {
          logger.error(
            'Command: error calling handler,' +
              'make sure to pass a proper function',
            err,
            err.stack
          );
          return onReject(err);
        }
      },
    });
  }

  /**
   * Function to handle message for data command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @param {object} err err from data command data handler.
   * @param {object} data result from data command data handler.
   * @override
   */
  message(parsedMessage, err, data) {
    if (err) {
      logger.error('data handler returned error', err);
      return;
    }

    if (this.getCommand().responseType || _.get(data, 'responseType')) {
      if (_.get(data, 'responseType') === 'rich') {
        postMessage(
          {
            botToken: this.getBotConfig().botToken,
            agent: this.getHttpAgent(),
          },
          Object.assign(data.response, {
            channel: parsedMessage.channel,
          })
        );
      } else {
        responseHandler.processFile(
          {
            channels: [parsedMessage.channel],
            message: {
              data: data,
              commandName: parsedMessage.message.command,
              config: this.getCommand().responseType,
              thread: parsedMessage.thread_ts,
            },
          },
          this.getBotConfig().botToken,
          this.getHttpAgent()
        );
      }
    } else if (data && _.isFunction(this.template)) {
      try {
        const renderedData = this.template(data);

        this.messageHandler({
          channels: [parsedMessage.channel],
          message: renderedData,
          thread: parsedMessage.thread_ts,
        });

        return renderedData;
      } catch (err) {
        logger.error(
          'Command: make sure to pass a' + 'compiled handlebar template',
          err,
          err.stack
        );
      }
    }
  }

  /**
   * Function to set timer for data command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @override
   */
  setEvent(parsedMessage) {
    return Promise.resolve(parsedMessage);
  }
};

module.exports = {
  Data,
};
