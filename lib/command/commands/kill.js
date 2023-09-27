'use strict';

// Load modules
import * as lodash from 'lodash-es';

import logger from '../../utils/logger.js';
import { Command } from '../command.js';
import { generateBotResponseTemplate } from '../../bot/response-handler.js';
const { toLower, get, set, unset, isEmpty } = lodash;
/**
 *
 * Represents the state and events of a kill command.
 *
 */
const Kill = class extends Command {
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
  constructor(options) {
    super(options);

    return this;
  }

  /**
   * Function to handle respond for kill command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @override
   */
  respond(parsedMessage) {
    const killTask = this.getParams(parsedMessage, 0);
    const scheduleId = toLower(this.getParams(parsedMessage, 1));
    const eventStore = this.getEventStore().get();

    const recursiveTaskTimer = [
      parsedMessage.channel + '_' + killTask,
      'timer',
    ];

    const alertTimerTaskPath = [killTask, 'timer'];
    const scheduleTaskPath = [scheduleId, 'timer'];

    const commandType = get(eventStore, [
      killTask,
      'tasks',
      scheduleId,
      'commandType',
    ]);
    const recursiveTimer = get(eventStore, recursiveTaskTimer);
    const scheduleTimer = get(eventStore, scheduleTaskPath);
    const alertTimer = get(eventStore, alertTimerTaskPath);

    const targetSchedule = get(this.getEventStore().getSchedules(), [
      scheduleId,
      'parsedMessage',
      'channel',
    ]);
    const scheduledUser = get(this.getEventStore().getSchedules(), [
      scheduleId,
      'parsedMessage',
      'user',
    ]);
    const isSameUser = parsedMessage.user !== scheduledUser;

    if (recursiveTimer) {
      clearInterval(recursiveTimer);
      set(eventStore, recursiveTaskTimer, undefined);

      this.messageHandler({
        channels: parsedMessage.channel,
        message: generateBotResponseTemplate({
          parsedMessage: parsedMessage,
          command: killTask,
          /* jshint ignore:start */
          recursiveStop: true,
          thread: parsedMessage.thread_ts,
          /* jshint ignore:end */
        }),
      });

      this.getEventStore()
        .remove(
          {
            eventType: 'events',
          },
          {
            parsedMessage: parsedMessage,
            channels: [parsedMessage.channel],
            commandToKill: [parsedMessage.channel + '_' + killTask],
          }
        )
        .catch((err) => {
          logger.error('Kill: Error killing recursive task', err);
        });
    } else if (alertTimer && commandType === 'ALERT') {
      if (!get(eventStore, [killTask, 'tasks', scheduleId])) {
        this.messageHandler({
          channels: parsedMessage.channel,
          message: generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            command: killTask,
            /* jshint ignore:start */
            alertFail: true,
            botName: this.getEventStore().botName,
            thread: parsedMessage.thread_ts,
            /* jshint ignore:end */
          }),
        });

        return;
      }

      this.messageHandler({
        channels: parsedMessage.channel,
        message: generateBotResponseTemplate({
          parsedMessage: parsedMessage,
          command: killTask,
          /* jshint ignore:start */
          recursiveStop: true,
          thread: parsedMessage.thread_ts,
          /* jshint ignore:end */
        }),
      });

      unset(eventStore, [killTask, 'tasks', scheduleId]);

      if (isEmpty(get(eventStore, [killTask, 'tasks']))) {
        clearInterval(alertTimer);
        unset(eventStore, alertTimerTaskPath);
      }

      this.getEventStore()
        .remove(
          {
            eventType: 'events',
          },
          {
            parsedMessage: parsedMessage,
            channels: [parsedMessage.channel],
            commandToKill: [scheduleId],
          }
        )
        .catch((err) => {
          logger.error('Kill: Error killing alert task', err);
        });
    } else if (scheduleTimer || killTask === 'SCHEDULE') {
      if (!scheduleTimer) {
        this.messageHandler({
          channels: parsedMessage.channel,
          message: generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            command: killTask,
            /* jshint ignore:start */
            scheduleFail: true,
            botName: this.getEventStore().botName,
            thread: parsedMessage.thread_ts,
            /* jshint ignore:end */
          }),
        });

        return;
      }

      if (parsedMessage.channel !== targetSchedule) {
        this.messageHandler({
          channels: parsedMessage.channel,
          message: generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            command: killTask,
            /* jshint ignore:start */
            schedulePrevilage: true,
            botName: this.getEventStore().botName,
            targetChannel: targetSchedule,
            thread: parsedMessage.thread_ts,
            /* jshint ignore:end */
          }),
        });

        return;
      }

      scheduleTimer.stop();
      set(eventStore, scheduleTaskPath, '');

      this.messageHandler({
        channels: parsedMessage.channel,
        message: generateBotResponseTemplate({
          parsedMessage: parsedMessage,
          command: killTask,
          /* jshint ignore:start */
          recursiveStop: true,
          isNotSameUser: isSameUser,
          user: parsedMessage.user,
          owner: scheduledUser,
          thread: parsedMessage.thread_ts,
          /* jshint ignore:end */
        }),
      });

      this.getEventStore()
        .remove(
          {
            eventType: 'schedule',
          },
          {
            parsedMessage: parsedMessage,
            channels: [parsedMessage.channel],
            commandToKill: [scheduleId],
          }
        )
        .catch((err) => {
          logger.error('Kill: Error killing schedule task', err);
        });
    } else {
      this.messageHandler({
        channels: parsedMessage.channel,
        message: generateBotResponseTemplate({
          parsedMessage: parsedMessage,
          command: killTask,
          /* jshint ignore:start */
          recursiveFail: true,
          thread: parsedMessage.thread_ts,
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
  process(parsedMessage) {
    this.respond(parsedMessage);
    return Promise.resolve();
  }

  /**
   * Function to set timer for kill command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @override
   */
  setEvent(parsedMessage) {
    return Promise.resolve(parsedMessage);
  }
};

export { Kill };
