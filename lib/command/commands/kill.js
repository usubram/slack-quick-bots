/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const _ = require('lodash');
const path = require('path');
const root = '..';

const botLogger = require(path.join(root, '../utils/logger'));
const Command = require(path.join(root, 'command'));
const responseHandler = require(path.join(root, '../bot/response-handler'));
const storage = require(path.join(root, '../storage/storage'));

const externals = {};

externals.Kill = class extends Command {
  constructor (options) {
    super(options);
    return this;
  }

  respond (parsedMessage) {
    var killTask = this.getParams(parsedMessage, 0);

    var recursiveTaskTimer = ['eventStore', parsedMessage.channel + '_' + killTask, 'timer'];
    var alertTaskPath = ['eventStore', parsedMessage.channel + '_' + killTask];
    var scheduleTaskPath = ['eventStore', parsedMessage.channel +
      '_schedule_' + this.getParams(parsedMessage, 1), 'timer'];

    var recursiveTimer = _.get(this.context[killTask], recursiveTaskTimer);
    var scheduleTimer = _.get(this.context[killTask], scheduleTaskPath);
    var alertTimer = _.get(this.context[killTask], _.concat(alertTaskPath, 'timer'));

    if (recursiveTimer) {
      clearInterval(recursiveTimer);
      _.set(this, recursiveTaskTimer, undefined);

      this.messageHandler({
        channels: parsedMessage.channel,
        message: responseHandler.generateBotResponseTemplate({
          parsedMessage: parsedMessage,
          command: killTask,
          /* jshint ignore:start */
          recursive_stop: true,
          /* jshint ignore:end */
        })
      });

      storage.removeEvents(this.getSlackData().self.name, 'events', {
        parsedMessage: parsedMessage,
        channels: [parsedMessage.channel],
        commandToKill: killTask
      }).catch((err) => {
        botLogger.logger.error('Kill: Error killing recursive task', err);
      });

    } else if (alertTimer) {
      delete this.eventStore[killTask].channel[parsedMessage.channel];
      this.messageHandler({
        channels: parsedMessage.channel,
        message: responseHandler.generateBotResponseTemplate({
          parsedMessage: parsedMessage,
          command: killTask,
          /* jshint ignore:start */
          recursive_stop: true,
          /* jshint ignore:end */
        })
      });

      if (_.isEmpty(this.eventStore[killTask].channel)) {
        clearInterval(this.eventStore[killTask].timer);
        this.eventStore[killTask].timer = undefined;
      }

      storage.removeEvents(this.getSlackData().self.name, 'events', {
        parsedMessage: parsedMessage,
        channels: [parsedMessage.channel],
        commandToKill: killTask
      }).catch((err) => {
        botLogger.logger.error('Kill: Error killing alert task', err);
      });

    } else if (scheduleTimer || killTask === 'schedule') {
      if (!scheduleTimer) {
        this.messageHandler({
          channels: parsedMessage.channel,
          message: responseHandler.generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            command: killTask,
            /* jshint ignore:start */
            schedule_fail: true,
            /* jshint ignore:end */
          })
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
        })
      });

      storage.removeEvents(this.getSlackData().self.name, 'schedule', {
        parsedMessage: parsedMessage,
        channels: [parsedMessage.channel],
        commandToKill: killTask + '_' + this.getParams(parsedMessage, 1)
      }).catch((err) => {
        botLogger.logger.error('Kill: Error killing schedule task', err);
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
        })
      });
    }
  }

  process (parsedMessage) {
    this.respond(parsedMessage);
    return Promise.resolve();
  }
};

module.exports = externals.Kill;
