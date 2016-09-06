/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var root = '..';

var botLogger = require(path.join(root, 'utils/logger'));

var internals = {
  STORAGE_DIRECTORY: path.join(process.cwd(), 'data'),
  EVENT_FILE_PATH: '',
  SCHEDULE_FILE_PATH: ''
};

internals.EVENT_FILE_PATH = path.join(internals.STORAGE_DIRECTORY, 'events.json');
internals.SCHEDULE_FILE_PATH = path.join(internals.STORAGE_DIRECTORY, 'schedule.json');

exports = module.exports.createEventDirectory = function () {
  fs.mkdir(internals.STORAGE_DIRECTORY, function (e) {
    if (!e || e && e.code === 'EEXIST') {
      botLogger.logger.debug('storage: directory already exist');
    } else {
      botLogger.logger.error('storage: unable create storage for ' + 'persitance, check if you write permission');
    }
  });
};

exports = module.exports.updateEvents = function (botName, eventType, data) {
  return Promise.resolve(internals.readFile(eventType)).then(function (eventsData) {
    if (data && data.parsedMessage && data.channels) {
      var result = eventsData || {};
      _.set(result, botName, internals.pickEvents(eventType, _.get(eventsData, botName, {}), data));
      return internals.writeFile(eventType, result);
    }
  }).then(function (responseData) {
    botLogger.logger.info('storage: events updates successfully');
    botLogger.logger.debug('storage: events updated successfully for ', responseData);
    return Promise.resolve(responseData);
  }).catch(function (err) {
    botLogger.logger.info('storage: events update failed');
    botLogger.logger.debug('storage: error updating events for ', err);
    return Promise.reject(err);
  });
};

exports = module.exports.removeEvents = function (botName, eventType, data) {
  return Promise.resolve({
    then: function then(onFulfill, onReject) {
      internals.readFile(eventType).then(function (eventsData) {
        if (_.get(data, 'channels', []).length) {
          _.forEach(data.channels, function (channel) {
            var eventPath = [botName, channel + '_' + _.get(data, 'commandToKill')];
            if (_.unset(eventsData, eventPath)) {
              botLogger.logger.info('storage: events updates successfully');
            }
          });
        }
        return eventsData;
      }).then(function (rData) {
        return internals.writeFile(eventType, rData);
      }).then(function (responseData) {
        botLogger.logger.info('storage: events updates successfully');
        botLogger.logger.debug('storage: events updated successfully for ', responseData);
        onFulfill(responseData);
      }).catch(function (err) {
        botLogger.logger.info('storage: events update failed');
        botLogger.logger.debug('storage: error updating events for ', err);
        onReject(err);
      });
    }
  });
};

exports = module.exports.getEvents = function (eventTypes) {
  return Promise.all([internals.readFile(eventTypes[0]), internals.readFile(eventTypes[1])]).then(function (eventData) {
    return _.merge({}, eventData[0], eventData[1]);
  });
};

internals.readFile = function (fileType) {
  var path = '';
  var fileData = '';
  if (fileType === 'events') {
    path = internals.EVENT_FILE_PATH;
  } else if (fileType === 'schedule') {
    path = internals.SCHEDULE_FILE_PATH;
  }

  return Promise.resolve({
    then: function then(onFulfill, onReject) {
      fs.readFile(path, { encoding: 'utf8', flag: 'a+' }, function (err, data) {
        if (err) {
          return onReject(err);
        }

        try {
          fileData = data ? JSON.parse(data) : '';
        } catch (parseErr) {
          botLogger.logger.info('storage: read file failed');
          botLogger.logger.debug('storage: read file failed', parseErr, path);
          return onReject(parseErr);
        }
        onFulfill(fileData);
      });
    }
  });
};

internals.writeFile = function (fileType, data) {
  var path = '';
  var fileData = JSON.stringify(data, null, 2);
  if (fileType === 'events') {
    path = internals.EVENT_FILE_PATH;
  } else if (fileType === 'schedule') {
    path = internals.SCHEDULE_FILE_PATH;
  }

  return Promise.resolve({
    then: function then(onFulfill, onReject) {
      fs.writeFile(path, fileData, { encoding: 'utf8', flag: 'w+' }, function (err) {
        if (err) {
          botLogger.logger.info('storage: write file failed');
          botLogger.logger.debug('storage: write file failed', err, path);
          return onReject(err);
        }
        onFulfill(data);
      });
    }
  });
};

internals.pickEvents = function (eventType, storeData, newdData) {
  _.forEach(newdData.channels, function (channel) {
    if (eventType === 'events') {
      _.set(storeData, channel + '_' + _.get(newdData, 'parsedMessage.message.command'), newdData);
    } else if (eventType === 'schedule') {
      _.set(storeData, channel + '_' + 'schedule' + '_' + _.get(newdData, 'parsedMessage.message.params[0]'), newdData);
    }
  });
  return storeData;
};