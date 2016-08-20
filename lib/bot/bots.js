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

const Bot = require(path.join(root, 'bot/bot'));
const botLogger = require(path.join(root, 'utils/logger'));

const externals = {};
const internals = {
  config: {
    bots: []
  },
  alertParams: ['sample', 'setup']
};

externals.Bots = class {
  constructor (bots) {
    this.bots = [];
    internals.config.bots = bots;
    internals.init(this.bots);
    return this;
  }

  getBots () {
    return this.bots;
  }
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
    var commandKey = _.camelCase(key);
    if (value) {
      normalizedCommand[commandKey] = value;
      _.forEach(value,
        function (commandAttr, commandAttrkey) {
        var command = _.camelCase(commandAttr);
        if (commandAttrkey === 'commandType') {
          value[commandAttrkey] = command;
        } else if (commandAttrkey === 'parentTask') {
          value[commandAttrkey] = command;
        }
        if (commandAttrkey === 'commandType' && _.includes(['alert', 'recursive'], command)) {
          if (command === 'alert') {
            value.allowedParam = internals.alertParams;
          }
          stopTasks.push(commandKey);
        }
      });
    }
  });

  if (stopTasks.length > 0) {
    normalizedCommand.stop = {
      allowedParam: stopTasks,
      commandType: 'kill'
    };
  }
  bot.botCommand = normalizedCommand;
  internals.mergeAllowedUsers(bot);
  return bot;
};

internals.mergeAllowedUsers = function (bot) {
  if (bot.allowedUsers) {
    _.forEach(bot.botCommand, function (command) {
      if (!command.allowedUsers) {
        command.allowedUsers = _.uniq(bot.allowedUsers);
      }
    });
  }
};

module.exports = externals.Bots;
