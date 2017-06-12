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
const storage = require(path.join(root, '../storage/storage'));

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
    const scheduleTask = _.toUpper(this.getParams(parsedMessage, 1));

    const recursiveTaskTimer = ['eventStore', parsedMessage.channel + '_' +
      killTask, 'timer'];
    const alertTaskPath = ['eventStore', killTask];
    const scheduleTaskPath = ['eventStore', parsedMessage.channel +
      '_schedule_' + scheduleTask, 'timer'];

    const recursiveTimer = _.get(this.context[killTask], recursiveTaskTimer);
    const scheduleTimer = _.get(this.context[killTask], scheduleTaskPath);
    const alertTimer = _.get(this.context[killTask], _.concat(alertTaskPath,
      'timer'));
    let alertChannels = _.get(this.context[killTask],
      ['eventStore', killTask, 'channel']);

    if (recursiveTimer) {
      clearInterval(recursiveTimer);
      _.set(this.context[killTask], recursiveTaskTimer, undefined);

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

      storage.removeEvents(this.getSlackData().self.name, 'events', {
        parsedMessage: parsedMessage,
        channels: [parsedMessage.channel],
        commandToKill: killTask,
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
        _.set(this.context[killTask], _.concat(alertTaskPath,
          'timer'), null);
      }

      storage.removeEvents(this.getSlackData().self.name, 'events', {
        parsedMessage: parsedMessage,
        channels: [parsedMessage.channel],
        commandToKill: killTask,
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
            /* jshint ignore:end */
          }),
        });

        return;
      }

      scheduleTimer.stop();
      _.set(this.context[killTask], scheduleTaskPath, undefined);

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

      storage.removeEvents(this.getSlackData().self.name, 'schedule', {
        parsedMessage: parsedMessage,
        channels: [parsedMessage.channel],
        commandToKill: killTask + '_' + scheduleTask,
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
