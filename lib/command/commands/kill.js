/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2017 Umashankar Subramanian
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

/**
*
* Represents the state and events of a kill command.
*
*/
externals.Kill = class extends Command {
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
  * Function to handle respond for kill command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @override
  */
  respond (parsedMessage) {
    const killTask = _.toUpper(this.getParams(parsedMessage, 0));
    const scheduleId = _.toLower(this.getParams(parsedMessage, 1));
    const eventStore = this.getEventStore().get();

    const recursiveTaskTimer = [parsedMessage.channel + '_' +
      killTask, 'timer'];
    const alertTaskPath = [parsedMessage.channel + '_' + killTask];
    const alertTimerTaskPath = [killTask, 'timer'];
    const scheduleTaskPath = [scheduleId, 'timer'];

    const recursiveTimer = _.get(eventStore, recursiveTaskTimer);
    const scheduleTimer = _.get(eventStore, scheduleTaskPath);
    const alertTimer = _.get(eventStore, alertTimerTaskPath);
    let alertChannels = _.get(eventStore,
      [killTask, 'channel']);

    if (recursiveTimer) {
      clearInterval(recursiveTimer);
      _.set(eventStore, recursiveTaskTimer, undefined);

      this.messageHandler({
        channels: parsedMessage.channel,
        message: responseHandler.generateBotResponseTemplate({
          parsedMessage: parsedMessage,
          command: killTask,
          /* jshint ignore:start */
          recursive_stop: true,
          /* jshint ignore:end */
        }),
      });

      this.getEventStore().remove({
        eventType: 'events',
      }, {
        parsedMessage: parsedMessage,
        channels: [parsedMessage.channel],
        commandToKill: [parsedMessage.channel + '_' +
          killTask],
      }).catch((err) => {
        logger.error('Kill: Error killing recursive task', err);
      });
    } else if (alertTimer && _.get(alertChannels, parsedMessage.channel)) {
      delete alertChannels[parsedMessage.channel];

      this.messageHandler({
        channels: parsedMessage.channel,
        message: responseHandler.generateBotResponseTemplate({
          parsedMessage: parsedMessage,
          command: killTask,
          /* jshint ignore:start */
          recursive_stop: true,
          /* jshint ignore:end */
        }),
      });

      if (_.isEmpty(alertChannels)) {
        clearInterval(alertTimer);
        _.set(eventStore, alertTimerTaskPath, null);
      }

      this.getEventStore().remove({
        eventType: 'events',
      }, {
        parsedMessage: parsedMessage,
        channels: [parsedMessage.channel],
        commandToKill: alertTaskPath,
      }).catch((err) => {
        logger.error('Kill: Error killing alert task', err);
      });
    } else if (scheduleTimer || killTask === 'SCHEDULE') {
      if (!scheduleTimer) {
        this.messageHandler({
          channels: parsedMessage.channel,
          message: responseHandler.generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            command: killTask,
            /* jshint ignore:start */
            schedule_fail: true,
            bot_name: this.getEventStore().botName,
            /* jshint ignore:end */
          }),
        });

        return;
      }

      scheduleTimer.stop();
      _.set(eventStore, scheduleTaskPath, '');

      this.messageHandler({
        channels: parsedMessage.channel,
        message: responseHandler.generateBotResponseTemplate({
          parsedMessage: parsedMessage,
          command: killTask,
          /* jshint ignore:start */
          recursive_stop: true,
          /* jshint ignore:end */
        }),
      });

      this.getEventStore().remove({
        eventType: 'schedule',
      }, {
        parsedMessage: parsedMessage,
        channels: [parsedMessage.channel],
        commandToKill: [scheduleId],
      }).catch((err) => {
        logger.error('Kill: Error killing schedule task', err);
      });
    } else {
      this.messageHandler({
        channels: parsedMessage.channel,
        message: responseHandler.generateBotResponseTemplate({
          parsedMessage: parsedMessage,
          command: killTask,
          /* jshint ignore:start */
          recursive_fail: true,
          /* jshint ignore:end */
        }),
      });
    }
  }

  /**
  * Function to handle process for kill command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @override
  */
  process (parsedMessage) {
    this.respond(parsedMessage);
    return Promise.resolve();
  }

  /**
  * Function to set timer for kill command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @override
  */
  setEvent (parsedMessage) {
    return Promise.resolve(parsedMessage);
  }
};

module.exports = externals.Kill;
