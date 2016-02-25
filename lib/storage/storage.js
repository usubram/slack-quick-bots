/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2015 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const fs = require('fs');
const _ = require('lodash');

const internals = {
  EVENT_FILE_PATH: __dirname + '/events.json'
};

exports = module.exports.updateEvents = function (botName, eventType, data) {
  internals._readFile('events', function (eventsData) {
    if (data && data.message && data.message.parsedMessage && data.message.channels) {
      eventsData = eventsData ? eventsData : {};
      eventsData[botName] = eventsData[botName] ? eventsData[botName] : {};
      _.forEach(data.message.channels, function (channel) {
        eventsData[botName][channel + '_' + data.message.parsedMessage.message.command] = data;
      });
    }
    internals._writeFile('events', eventsData, function (err) {
      // Write callback
    });
  });
};

exports = module.exports.removeEvents = function (botName, eventType, data) {
  internals._readFile('events', function (eventsData) {
    if (data && data.message  && data.message.parsedMessage && data.message.channels) {
      eventsData = eventsData ? eventsData : {};
      eventsData[botName] = eventsData[botName] ? eventsData[botName] : {};
      _.forEach(data.message.channels, function (channel) {
        delete eventsData[botName][channel + '_' + data.message.command];
      });
    }
    internals._writeFile('events', eventsData, function (err) {
      // Write callback
    });
  });
};

exports = module.exports.getEvents = function (eventType) {
  return new Promise(function (resolve, reject) {
    internals._readFile('events', function (eventsData) {
      resolve(eventsData);
    });
  });
};

internals._readFile = function (fileType, callback) {
  var path = '';
  var fileData = '';
  if (fileType === 'events') {
    path = internals.EVENT_FILE_PATH;
  }
  fs.open(path, 'a+', function (err, fd) {
    if (err) {
      throw 'error opening file: ' + err;
    }
    fs.fstat(fd, function(err, stats) {
      if (stats.size === 0) {
        callback(fileData);
        return;
      }
      var fileBuffer = new Buffer(stats.size);
      fs.read(fd, fileBuffer, 0, fileBuffer.length, null,
        function(err, bytesRead, buffer) {
          if(err) throw err;
          try {
            fileData = JSON.parse(buffer.toString('utf8', 0, fileBuffer.length));
            callback(fileData);
          } catch (e) {
            // Something wrong
            callback('');
          }
          fs.close(fd);
        }
      );
    });
  });
};

internals._writeFile = function (fileType, data, callback) {
  var path = '';
  var fileData = JSON.stringify(data);
  if (fileType === 'events') {
    path = internals.EVENT_FILE_PATH;
  }
  fs.open(path, 'w+', function (err, fd) {
    if (err) {
      throw 'error opening file: ' + err;
    }
    var fileBuffer = new Buffer(fileData, fileData.length, 'utf8');
    fs.write(fd, fileBuffer, 0, fileBuffer.length, null,
      function(err, bytesRead, buffer) {
        if(err) {
          // log err
        }
        try {
          JSON.parse(buffer.toString('utf8', 0, fileBuffer.length));
          callback(fileData);
        } catch (e) {
          callback('');
          // log
        }
        fs.close(fd);
      }
    );
  });
};
