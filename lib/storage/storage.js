'use strict';

import { mkdir, readFile as _readFile, writeFile as _writeFile } from 'fs';
import * as lodash from 'lodash-es';
import { join } from 'path';

import logger from '../utils/logger.js';

const STORAGE_DIRECTORY = join(process.cwd(), 'data');
const EVENT_FILE_PATH = join(STORAGE_DIRECTORY, 'events.json');
const SCHEDULE_FILE_PATH = join(STORAGE_DIRECTORY, 'schedule.json');

const { set, get, forEach, concat, toLower, unset, toUpper } = lodash;
const Storage = class {
  /**
   * Updates events.
   *
   * @param {object} options contains botName and eventType.
   * @param {object} data to update.
   *
   * @return {object} Event data.
   */
  static updateEvents(options, data) {
    return this.readFile(options.eventType)
      .then((eventsData) => {
        if (data && data.parsedMessage && data.channels) {
          const result = eventsData || {};
          set(
            result,
            options.botName,
            pickEvents(options, get(eventsData, options.botName, {}), data)
          );

          return this.writeFile(options.eventType, result);
        }
      })
      .then((responseData) => {
        logger.info('Events updates successfully');
        logger.debug('Event: ', responseData);

        return Promise.resolve(responseData);
      })
      .catch((err) => {
        logger.info('Events update failed');
        logger.debug('Event: ', err);

        return Promise.reject(err);
      });
  }

  /**
   * Removes events.
   *
   * @param {object} options contains botName and eventType.
   * @param {object} data to remove.
   *
   * @return {object} Event data.
   */
  static removeEvents(options, data) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        this.readFile(options.eventType)
          .then((eventsData) => {
            if (get(data, 'channels', []).length) {
              forEach(data.channels, function () {
                const eventPath = concat(
                  options.botName,
                  get(data, 'commandToKill')
                );
                const compatibleEventPath = [
                  options.botName,
                  toLower(get(data, 'commandToKill')),
                ];

                if (unset(eventsData, eventPath)) {
                  unset(eventsData, compatibleEventPath);
                  logger.info('Events updates successfully');
                }
              });
            }

            return eventsData;
          })
          .then((rData) => {
            return this.writeFile(options.eventType, rData);
          })
          .then((responseData) => {
            logger.info('Events removed successfully');
            logger.debug('Events removed successfully for ', responseData);
            onFulfill(responseData);
          })
          .catch((err) => {
            logger.info('Events removed failed');
            logger.debug('Events remove error with ', err);
            onReject(err);
          });
      },
    });
  }

  /**
   * Get all events eventTypes.
   *
   * @param {array} eventTypes contains botName and eventType.
   *
   * @return {object} Event data.
   */
  static getEvents(eventTypes) {
    return Promise.all([
      this.readFile(eventTypes[0]),
      this.readFile(eventTypes[1]),
    ]).then((eventData) => {
      return {
        events: eventData[0],
        schedule: eventData[1],
      };
    });
  }

  /**
   * Get directory for events.
   */
  static createEventDirectory() {
    mkdir(STORAGE_DIRECTORY, function (e) {
      if (!e || (e && e.code === 'EEXIST')) {
        logger.info('Data directory already exist, so not creating');
      } else {
        logger.error(
          'Unable to create storage for ' +
            'persitance, check if you write permission'
        );
      }
    });
  }

  /**
   * Read file by fileType.
   *
   * @param {String} fileType events or schedule.
   *
   * @return {object} Event data.
   */
  static readFile(fileType) {
    let path = '';
    let fileData = '';

    if (fileType === 'events') {
      path = EVENT_FILE_PATH;
    } else if (fileType === 'schedule') {
      path = SCHEDULE_FILE_PATH;
    }

    return Promise.resolve({
      then: (onFulfill, onReject) => {
        _readFile(
          path,
          {
            encoding: 'utf8',
            flag: 'a+',
          },
          function (err, data) {
            if (err) {
              return onReject(err);
            }

            try {
              fileData = data ? JSON.parse(data) : '';
            } catch (parseErr) {
              logger.info('Reading event file failed');
              logger.debug('Reading file event failed', parseErr, path);
              return onReject(parseErr);
            }
            onFulfill(fileData);
          }
        );
      },
    });
  }

  /**
   * Write file by fileType.
   *
   * @param {String} fileType events or schedule.
   * @param {Object} data data to write.
   *
   * @return {object} Event data.
   */
  static writeFile(fileType, data) {
    let path = '';
    const fileData = JSON.stringify(data, null, 2);

    if (fileType === 'events') {
      path = EVENT_FILE_PATH;
    } else if (fileType === 'schedule') {
      path = SCHEDULE_FILE_PATH;
    }

    return Promise.resolve({
      then: (onFulfill, onReject) => {
        _writeFile(
          path,
          fileData,
          {
            encoding: 'utf8',
            flag: 'w+',
          },
          function (err) {
            if (err) {
              logger.info('Write event to file failed');
              logger.debug('Write event file failed', err, path);
              return onReject(err);
            }
            onFulfill(data);
          }
        );
      },
    });
  }
};

const pickEvents = function (options, storeData, newData) {
  const eventTask = toUpper(get(newData, 'parsedMessage.message.command'));

  forEach(newData.channels, function (channel) {
    if (options.id) {
      set(storeData, options.id, newData);
    } else {
      set(storeData, channel + '_' + eventTask, newData);
    }
  });

  return storeData;
};

export { Storage };
