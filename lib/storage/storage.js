/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2018 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const root = '..';

const logger = require(path.join(root, 'utils/logger'));

const STORAGE_DIRECTORY = path.join(process.cwd(), 'data');
const EVENT_FILE_PATH = path
  .join(STORAGE_DIRECTORY, 'events.json');
const SCHEDULE_FILE_PATH = path
  .join(STORAGE_DIRECTORY, 'schedule.json');

const Storage = class {
  /**
  * Updates events.
  *
  * @param {object} options contains botName and eventType.
  * @param {object} data to update.
  *
  * @return {object} Event data.
  */
  static updateEvents (options, data) {
    return Promise.resolve(this.readFile(options.eventType))
      .then((eventsData) => {
        if (data && data.parsedMessage && data.channels) {
          const result = eventsData || {};
          _.set(result, options.botName, pickEvents(options,
            _.get(eventsData, options.botName, {}), data));

          return this.writeFile(options.eventType, result);
        }
      }).then((responseData) => {
        logger.info('Events updates successfully');
        logger.debug('Event: ', responseData);

        return Promise.resolve(responseData);
      }).catch((err) => {
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
  static removeEvents (options, data) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        this.readFile(options.eventType)
          .then((eventsData) => {
            if (_.get(data, 'channels', []).length) {
              _.forEach(data.channels, function (channel) {
                const eventPath = _.concat(options.botName, _.get(data,
                  'commandToKill'));
                const compatibleEventPath = [options.botName,
                  _.toLower(_.get(data, 'commandToKill'))];

                if (_.unset(eventsData, eventPath)) {
                  _.unset(eventsData, compatibleEventPath);
                  logger.info('Events updates successfully');
                }
              });
            }

            return eventsData;
          }).then((rData) => {
            return this.writeFile(options.eventType, rData);
          }).then((responseData) => {
            logger.info('Events removed successfully');
            logger.debug('Events removed successfully for ', responseData);
            onFulfill(responseData);
          }).catch((err) => {
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
  static getEvents (eventTypes) {
    return Promise.all([this.readFile(eventTypes[0]),
      this.readFile(eventTypes[1])]).then((eventData) => {
      return {
        events: eventData[0],
        schedule: eventData[1],
      };
    });
  }

  /**
  * Get directory for events.
  */
  static createEventDirectory () {
    fs.mkdir(STORAGE_DIRECTORY, function (e) {
      if (!e || (e && e.code === 'EEXIST')) {
        logger.info('Data directory already exist, so not creating');
      } else {
        logger.error('Unable to create storage for ' +
          'persitance, check if you write permission');
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
  static readFile (fileType) {
    let path = '';
    let fileData = '';

    if (fileType === 'events') {
      path = EVENT_FILE_PATH;
    } else if (fileType === 'schedule') {
      path = SCHEDULE_FILE_PATH;
    }

    return Promise.resolve({
      then: (onFulfill, onReject) => {
        fs.readFile(path, {
          encoding: 'utf8',
          flag: 'a+',
        }, function (err, data) {
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
        });
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
  static writeFile (fileType, data) {
    let path = '';
    const fileData = JSON.stringify(data, null, 2);

    if (fileType === 'events') {
      path = EVENT_FILE_PATH;
    } else if (fileType === 'schedule') {
      path = SCHEDULE_FILE_PATH;
    }

    return Promise.resolve({
      then: (onFulfill, onReject) => {
        fs.writeFile(path, fileData, {
          encoding: 'utf8',
          flag: 'w+',
        }, function (err) {
          if (err) {
            logger.info('Write event to file failed');
            logger.debug('Write event file failed', err, path);
            return onReject(err);
          }
          onFulfill(data);
        });
      },
    });
  }
};

const pickEvents = function (options, storeData, newData) {
  const eventTask = _.toUpper(
    _.get(newData, 'parsedMessage.message.command'));

  _.forEach(newData.channels, function (channel) {
    if (options.id) {
      _.set(storeData, options.id, newData);
    } else {
      _.set(storeData, channel + '_' + eventTask, newData);
    }
  });

  return storeData;
};

module.exports = Storage;
