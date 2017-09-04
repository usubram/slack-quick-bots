/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2017 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const root = '..';

const logger = require(path.join(root, 'utils/logger'));

const internals = {
  STORAGE_DIRECTORY: path.join(process.cwd(), 'data'),
  EVENT_FILE_PATH: '',
  SCHEDULE_FILE_PATH: '',
};

internals.EVENT_FILE_PATH = path
  .join(internals.STORAGE_DIRECTORY, 'events.json');
internals.SCHEDULE_FILE_PATH = path
  .join(internals.STORAGE_DIRECTORY, 'schedule.json');

exports.createEventDirectory = function () {
  fs.mkdir(internals.STORAGE_DIRECTORY, function (e) {
    if (!e || (e && e.code === 'EEXIST')) {
      logger.info('Data directory already exist, so not creating');
    } else {
      logger.error('Unable to create storage for ' +
        'persitance, check if you write permission');
    }
  });
};

exports.updateEvents = function (options, data) {
  return Promise.resolve(exports.readFile(options.eventType))
    .then((eventsData) => {
      if (data && data.parsedMessage && data.channels) {
        let result = eventsData || {};
        _.set(result, options.botName, internals.pickEvents(options,
          _.get(eventsData, options.botName, {}), data));

        return exports.writeFile(options.eventType, result);
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
};

exports.removeEvents = function (options, data) {
  return Promise.resolve({
    then: (onFulfill, onReject) => {
      exports.readFile(options.eventType)
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
          return exports.writeFile(options.eventType, rData);
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
};

exports.getEvents = function (eventTypes) {
  return Promise.all([exports.readFile(eventTypes[0]),
    exports.readFile(eventTypes[1])]).then((eventData) => {
      return {
        events: eventData[0],
        schedule: eventData[1],
      };
    });
};

exports.readFile = function (fileType) {
  let path = '';
  let fileData = '';

  if (fileType === 'events') {
    path = internals.EVENT_FILE_PATH;
  } else if (fileType === 'schedule') {
    path = internals.SCHEDULE_FILE_PATH;
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
};

exports.writeFile = function (fileType, data) {
  let path = '';
  const fileData = JSON.stringify(data, null, 2);

  if (fileType === 'events') {
    path = internals.EVENT_FILE_PATH;
  } else if (fileType === 'schedule') {
    path = internals.SCHEDULE_FILE_PATH;
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
};

internals.pickEvents = function (options, storeData, newData) {
  const eventTask = _.toUpper(
    _.get(newData, 'parsedMessage.message.command'));

  _.forEach(newData.channels, function (channel) {
    if (options.eventType === 'events') {
      _.set(storeData, channel + '_' + eventTask, newData);
    } else if (options.eventType === 'schedule') {
      _.set(storeData, options.id, newData);
    }
  });

  return storeData;
};
