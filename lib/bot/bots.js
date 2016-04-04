/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2015 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const _ = require('lodash');
const Bot = require('./bot');
const botLogger = require('./../../lib/utils/logger');

const internals = {
  config: {
    bots: []
  },
  alertParams: ['sample', 'setup']
};

exports = module.exports = internals.Bots = function (bots) {
  this.bots = [];
  internals.config.bots = bots;
  internals.init(this.bots);
  return this;
};

internals.Bots.prototype.getBots = function () {
  return this.bots;
};

internals.init = function (bots) {
  _.forEach(internals.config.bots, (bot) => {
    var newbot = new Bot(internals.normalizeCommand(bot));
    if (newbot) {
      botLogger.logger.info('Bots: Bot instantiated correctly');
      bots.push(newbot);
    } else {
      botLogger.logger.warn('Bots: Error creating bot object,' +
        'something bad with this bot config %j', bot);
    }
  });
  botLogger.logger.info('Bots: All bots read completed');
};

internals.normalizeCommand = function (bot) {
  var normalizedCommand = {};
  var stopTasks = [];
  _.forEach(bot.botCommand, function (value, key) {
    var commandKey = _.camelCase(key)
    if (value) {
      normalizedCommand[commandKey] = value;
      _.forEach(value,
        function (commandAttr, commandAttrkey) {
        var command = _.camelCase(commandAttr)
        if (commandAttrkey === 'commandType') {
          value[commandAttrkey] = command;
        } else if (commandAttrkey === 'parentTask') {
          value[commandAttrkey] = command;
        }
        if (commandAttrkey === 'commandType' && _.includes(['alert', 'recursive'], command)) {
          if (command === 'alert') {
            value['allowedParam'] = internals.alertParams;
          }
          stopTasks.push(commandKey);
        }
      });
    }
  });

  if (stopTasks.length > 0) {
    normalizedCommand['stop'] = {};
    normalizedCommand['stop'].allowedParam = stopTasks;
    normalizedCommand['stop'].commandType = 'kill';
  }
  bot.botCommand = normalizedCommand;
  internals.mergeAllowedUsers(bot);
  return bot;
};

internals.mergeAllowedUsers = function (bot) {
  if (bot.allowedUsers) {
    _.forEach(bot.botCommand, function (command, key) {
      if (!command.allowedUsers) {
        command.allowedUsers = _.uniq(bot.allowedUsers);
      }
    });
  }
};
