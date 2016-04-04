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
const path = require('path');

const botLogger = require('./../../lib/utils/logger');
const env = require('./../../lib/utils/environment');

const internals = {
  STORAGE_DIRECTORY: path.join(process.cwd(), 'data'),
  EVENT_FILE_PATH: ''
};

internals.EVENT_FILE_PATH = path.join(internals.STORAGE_DIRECTORY, 'events.json');

fs.mkdir(internals.STORAGE_DIRECTORY, function (e) {
  if (!e || (e && e.code === 'EEXIST')) {
    if (env.dev) {
      botLogger.logger.info('storage: directory already exist');
    }
  } else {
    botLogger.logger.error('storage: unable create storage for ' +
      'persitance, check if you write permission');
  }
});

exports = module.exports.updateEvents = function (botName, eventType, data) {
  internals.readFile('events', function (err, eventsData) {
    if (data && data.parsedMessage && data.channels) {
      eventsData = eventsData ? eventsData : {};
      eventsData[botName] = eventsData[botName] ? eventsData[botName] : {};
      _.forEach(data.channels, function (channel) {
        eventsData[botName][channel + '_' + data.parsedMessage.message.command] = data;
      });
    }
    internals.writeFile('events', eventsData, function (err) {
      if (err) {
        botLogger.logger.info('storage: events update failed');
        if (env.dev) {
          botLogger.logger.info('storage: error updating events for ', eventsData);
        }
      } else {
        botLogger.logger.info('storage: events updates successfully');
        if (env.dev) {
          botLogger.logger.info('storage: events updated successfully for ', eventsData);
        }
      }
    });
  });
};

exports = module.exports.removeEvents = function (botName, eventType, data) {
  internals.readFile('events', function (err, eventsData) {
    if (data && data.parsedMessage && data.channels) {
      eventsData = eventsData ? eventsData : {};
      eventsData[botName] = eventsData[botName] ? eventsData[botName] : {};
      _.forEach(data.channels, function (channel) {
        delete eventsData[botName][channel + '_' + data.command];
      });
    }
    internals.writeFile('events', eventsData, function (err) {
      if (err) {
        botLogger.logger.info('storage: remove events failed');
        if (env.dev) {
          botLogger.logger.info('storage: error on remove events for ', eventsData);
        }
      } else {
        botLogger.logger.info('storage: event removed successfully');
        if (env.dev) {
          botLogger.logger.info('storage: event removed successfully for ', eventsData);
        }
      }
    });
  });
};

exports = module.exports.getEvents = function (eventType) {
  return new Promise(function (resolve, reject) {
    internals.readFile('events', function (err, eventsData) {
      if (err) {
        reject(err);
      }
      resolve(eventsData);
    });
  });
};

internals.readFile = function (fileType, callback) {
  var path = '';
  var fileData = '';
  if (fileType === 'events') {
    path = internals.EVENT_FILE_PATH;
  }
  fs.open(path, 'a+', function (err, fd) {
    if (err) {
      botLogger.logger.info('storage: read file failed');
      if (env.dev) {
        botLogger.logger.info('storage: read file failed', err, path);
      }
    }
    fs.fstat(fd, function(err, stats) {
      if (stats.size === 0) {
        callback(null, fileData);
        return;
      }
      var fileBuffer = new Buffer(stats.size);
      fs.read(fd, fileBuffer, 0, fileBuffer.length, null,
        function(err, bytesRead, buffer) {
          if (err) {
            throw err;
          }
          try {
            fileData = JSON.parse(buffer.toString('utf8', 0, fileBuffer.length));
            callback(null, fileData);
          } catch (e) {
            if (e) {
              botLogger.logger.info('storage: json parse error, bad file content');
              if (env.dev) {
                botLogger.logger.info('storage: json parse error', fileData);
              }
            }
            callback(e);
          }
          fs.close(fd);
        }
      );
    });
  });
};

internals.writeFile = function (fileType, data, callback) {
  var path = '';
  var fileData = JSON.stringify(data, null, 2);
  if (fileType === 'events') {
    path = internals.EVENT_FILE_PATH;
  }
  fs.open(path, 'w+', function (err, fd) {
    if (err) {
      botLogger.logger.info('storage: write file failed');
      if (env.dev) {
        botLogger.logger.info('storage: write file failed', err, path);
      }
    }
    var fileBuffer = new Buffer(fileData, fileData.length, 'utf8');
    fs.write(fd, fileBuffer, 0, fileBuffer.length, null,
      function(err, bytesRead, buffer) {
        if (err) {
          throw err;
        }
        try {
          JSON.parse(buffer.toString('utf8', 0, fileBuffer.length));
          callback(null, fileData);
        } catch (e) {
          if (e) {
            botLogger.logger.info('storage: json parse error, bad file content');
            if (env.dev) {
              botLogger.logger.info('storage: json parse error', fileData);
            }
          }
          callback(e);
        }
        fs.close(fd);
      }
    );
  });
};
