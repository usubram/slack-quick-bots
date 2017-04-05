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
const logger = require(path.join(root, 'utils/logger'));

const externals = {};
const internals = {
  config: {
    bots: []
  },
  alertParams: ['sample', 'setup']
};

externals.Bots = class {
  constructor (config) {
    this.bots = [];

    this.setup(config, config.bots);

    return this;
  }

  setup (config, bots) {
    _.forEach(bots, (bot) => {
      var newbot = new Bot(internals.normalizeCommand(bot));
      if (newbot) {
        logger.info('Bots instantiated successfully');
        if (config.proxy) {
          newbot.proxy = config.proxy;
        }

        this.bots.push(newbot);
      } else {
        logger.error('Bots instantiation failed. Check your config');
      }
    });
  }

  getBots () {
    return this.bots;
  }
};

internals.normalizeCommand = function (bot) {
  var normalizedCommand = {};
  var stopTasks = [];
  var dataTasks = [];
  _.forEach(bot.botCommand, function (value, key) {
    var commandKey = _.toUpper(key).replace(/\s/g, '');
    if (value) {
      normalizedCommand[commandKey] = value;
      _.forEach(value,
        function (commandAttr, commandAttrkey) {
          var command = _.toUpper(commandAttr).replace(/\s/g, '');
          if (commandAttrkey === 'commandType') {
            value[commandAttrkey] = command;
            if (command === 'DATA') {
              dataTasks.push(commandKey);
            }
            if (_.includes(['ALERT', 'RECURSIVE'], command)) {
              if (command === 'ALERT') {
                value.allowedParam = internals.alertParams;
              }
              stopTasks.push(commandKey);
            }
          } else if (commandAttrkey === 'parentTask') {
            value[commandAttrkey] = command;
          }
        }
      );
    }
  });

  if (dataTasks.length > 0 && bot.schedule) {
    normalizedCommand['SCHEDULE'] = {
      allowedParam: dataTasks,
      commandType: 'SCHEDULE'
    };
    stopTasks.push('SCHEDULE');
  }

  if (stopTasks.length > 0) {
    normalizedCommand['STOP'] = normalizedCommand['STOP'] ? normalizedCommand['STOP'] : {};
    normalizedCommand['STOP'].allowedParam = stopTasks;
    normalizedCommand['STOP'].commandType = 'KILL';
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
