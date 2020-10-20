'use strict';

const _ = require('lodash');

const logger = require('../../utils/logger');
const { Command } = require('../command');
const responseHandler = require('../../bot/response-handler');
const postMessage = require('../../slack-api/post-message');

/**
 *
 * Represents the state and events of a flow command.
 *
 */
const Flow = class extends Command {
  /**
   * Creates a new Flow instance.
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

        this.questionKey = this.getQuestionKey(parsedMessage);

        this.timerKey = [
          this.commandName,
          parsedMessage.channel,
          parsedMessage.user,
          'timer',
        ];

        const timer = _.get(this.getEventStore().get(), this.timerKey);

        this.timeout =
          Number(this.getCommand().timeout) > 0
            ? Number(this.getCommand().timeout) * 60000
            : 2 * 60000;

        let question = this.getEventStore().get(this.questionKey, []);
        if ((question || []).length === 0) {
          question = this.getEventStore().set(
            this.questionKey,
            _.compact(
              this.getCommand().validation.map((item) =>
                Object.assign({}, item)
              )
            )
          );
        }

        this.currentQuestion = question.filter((item) => {
          return !item.redo && !item.answered;
        })[0];

        if (!timer) {
          this.getEventStore().set(
            this.timerKey,
            this.setTimer(this.timeout, this.questionKey, this.timerKey)
          );
        }

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
        if (this.isRedo(parsedMessage)) {
          const flow = this.isFlowExist();

          this.invalidateFlow(this.questionKey, this.timerKey);

          this.messageHandler({
            channels: parsedMessage.channel,
            message: responseHandler.generateBotResponseTemplate({
              parsedMessage: parsedMessage,
              noflow: flow,
              flowExist: !flow,
              botName: this.getEventStore().botName,
            }),
            thread: parsedMessage.thread_ts,
          });

          return onFulfill();
        }

        const timer = this.getEventStore().get(this.timerKey);

        if (!timer) {
          this.messageHandler({
            channels: parsedMessage.channel,
            message: responseHandler.generateBotResponseTemplate({
              parsedMessage: parsedMessage,
              flowExpired: true,
              botName: this.getEventStore().botName,
            }),
            thread: parsedMessage.thread_ts,
          });

          return onFulfill();
        }

        try {
          this.callback = (err, data) => {
            onFulfill(this.message.bind(this, parsedMessage)(err, data));
          };

          const localDataFunction = this.getCommand().data;
          const dataFunctionArguments = [
            {
              command: parsedMessage.message.command,
              params: parsedMessage.message.params,
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

    if (this.isRedo(parsedMessage)) {
      return;
    }

    let renderedData = {};
    if (_.get(data, 'terminated') === true) {
      const flow = this.isFlowExist();
      this.invalidateFlow(this.questionKey, this.timerKey);

      if (_.get(data, 'error')) {
        if (_.isFunction(this.template)) {
          data._response = {
            response: data.response,
          };
          renderedData = this.template(data);

          this.messageHandler({
            channels: [parsedMessage.channel],
            message: renderedData,
            thread: parsedMessage.thread_ts,
          });
        } else if (_.get(data, 'responseType') === 'rich') {
          postMessage(
            {
              botToken: this.getBotConfig().botToken,
              agent: this.getHttpAgent(),
            },
            Object.assign(data.response, {
              channel: parsedMessage.channel,
              thread_ts: parsedMessage.thread_ts || 
                _.get(data, 'thread') ? parsedMessage.thread_ts || parsedMessage.ts : ''
            })
          );
        }
      } else {
        this.messageHandler({
          channels: parsedMessage.channel,
          message: responseHandler.generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            noflow: flow,
            flowExist: !flow,
            botName: this.getEventStore().botName,
          }),
          thread: parsedMessage.thread_ts,
        });
      }

      return;
    }

    if (data && data.orderedResponse && data.orderedResponse.length > 0) {
      data._response = {
        response: data.orderedResponse.map((item, index) => {
          return {
            [index + 1]: Object.assign({}, item),
          };
        }),
      };
    }

    if (data && data.response) {
      data._response = {
        response: data.response,
      };
    }

    data = Object.assign(
      {
        botName: this.getEventStore().botName,
        commandName: this.commandName,
      },
      data
    );

    this.getEventStore()
      .get(this.questionKey)
      .forEach((item) => {
        if (this.currentQuestion.index === item.index) {
          item.answered = true;
          item.answer = data._response;
          item.postbackResponse = data.postbackResponse;
        }
      });

    if (this.getCommand().responseType || _.get(data, 'responseType')) {
      if (_.get(data, 'responseType') === 'rich') {
        postMessage(
          {
            botToken: this.getBotConfig().botToken,
            agent: this.getHttpAgent(),
          },
          Object.assign(data.response, {
            channel: parsedMessage.channel,
            thread_ts: _.get(data, 'thread') ? parsedMessage.thread_ts || parsedMessage.ts : ''
          })
        );
      } else {
        responseHandler.processFile(
          {
            channels: [parsedMessage.channel],
            message: {
              data,
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
        renderedData = this.template(data);

        this.messageHandler({
          channels: [parsedMessage.channel],
          message: renderedData,
          thread: parsedMessage.thread_ts,
        });
      } catch (err) {
        logger.error(
          'Command: make sure to pass a' + 'compiled handlebar template',
          err,
          err.stack
        );
      }
    }

    if (_.get(data, 'finished') === true) {
      this.invalidateFlow(this.questionKey, this.timerKey);
    }

    return renderedData;
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

  /**
   * Function to build options to data handler.
   *
   * @param {object} slackResponse slack message.
   * @param {object} slackData slack data.
   * @param {object} purpose hook purpose data.
   * @return {object}
   *
   * @override
   */
  buildOptions(slackResponse, slackData, purpose) {
    const user = _.find(slackData.members, {
      id: slackResponse.user,
    });

    const validation = _.get(this.getEventStore().get(), this.questionKey, []);
    let response = {};
    if (validation) {
      response = validation.reduce((acc, item, index) => {
        if (item.redo) {
          return acc;
        }

        const { answered = false, answer = '', postbackResponse = '' } = item;
        acc[index - 1] = {
          answered,
          answer,
          postbackResponse,
        };

        return acc;
      }, {});
    }

    return Object.assign(
      {
        channel: slackResponse.channel,
        hookUrl: _.get(purpose, 'url', ''),
        user: user || { id: slackResponse.user },
      },
      { response }
    );
  }

  /**
   * Function to check if the flow is for redo.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @return {boolean}
   */
  isRedo(parsedMessage) {
    return 'REDO' === this.getParams(parsedMessage, 0);
  }

  /**
   * Function to check if there is an existing flow.
   *
   * @return {boolean}
   */
  isFlowExist() {
    const flow = this.getEventStore()
      .get(this.questionKey)
      .filter((item) => {
        return item.answered;
      });

    return flow.length === 0;
  }

  /**
   * Function to handle set timer for flow command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @param {object} path path of timer.
   * @param {object} timeInterval time interval to call quietRespond.
   *
   * @override
   */
  setTimer(timeout, questionKey, timerKey) {
    return setTimeout(() => {
      this.invalidateFlow.bind(this, questionKey, timerKey)();
    }, timeout);
  }

  /**
   * Function to invalidate flow timer.
   *
   * @param {array} questionKey question runtime path.
   * @param {array} timerKey timer runtime path.
   *
   */
  invalidateFlow(questionKey, timerKey) {
    const timer = this.getEventStore().get(timerKey);
    clearTimeout(timer);
    this.getEventStore().set(timerKey, undefined);
    this.getEventStore().set(questionKey, []);
  }

  /**
   * Function to get event store key for storing question and responses.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @return {array}
   *
   */
  getQuestionKey(parsedMessage) {
    return [
      this.commandName,
      parsedMessage.channel,
      parsedMessage.user,
      'questions',
    ];
  }

  /**
   * Function to get validation schema for custom flow validation.
   * Used in parent class.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @return {array}
   *
   */
  getFlowValidations(parsedMessage) {
    const eventStore = this.getEventStore().get(
      this.getQuestionKey(parsedMessage)
    );
    const validations =
      eventStore && eventStore.length > 0
        ? eventStore
        : this.getCommand().validation;

    const pickCount = 2;
    return _.take(
      validations.filter((item) => {
        return item.redo || !item.answered || item.preset;
      }),
      pickCount
    );
  }
};

module.exports = {
  Flow,
};
