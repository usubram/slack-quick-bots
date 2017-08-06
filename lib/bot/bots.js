/**
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2017 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

// Load modules
const _ = require('lodash');
const handlebars = require('handlebars');
const path = require('path');
const root = '..';

const Bot = require(path.join(root, 'bot/bot'));
const logger = require(path.join(root, 'utils/logger'));

const externals = {};
const internals = {
  config: {
    bots: [],
  },
  alertParams: ['setup'],
};

/**
*
* Represents list of bots and normalize bot config.
*
*/
externals.Bots = class {
  /**
  * Represents list of bots and normalize bot config.
  * @param {object} config Bots config.
  * @class
  */
  constructor (config) {
    this.bots = [];

    this.setup(config, config.bots);

    return this;
  }

  /**
  * Function to setup bot config normalization.
  * @param {object} config Identifier for the hook request.
  * @param {array} bots List of bot in config.
  */
  setup (config, bots) {
    _.forEach(bots, (bot) => {
      const newbot = new Bot(internals.normalizeCommand(bot));

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

  /**
  * Function to get list of normalized bot config.
  * @return {array} List of normalized bot config.
  */
  getBots () {
    return this.bots;
  }
};

/**
* Function to normalize bot config data.
*
* @param {object} bot bot config.
* @return {object} Normalized bot config.
*/
internals.normalizeCommand = function (bot) {
  let normalizedCommand = {};
  let stopTasks = [];
  let dataTasks = [];

  _.forEach(bot.botCommand, function (value, key) {
    const commandKey = _.toUpper(key).replace(/\s/g, '');

    if (value) {
      normalizedCommand[commandKey] = value;

      _.forEach(value,
        function (commandAttr, commandAttrkey) {
          const command = _.toUpper(commandAttr).replace(/\s/g, '');

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
          } else if (commandAttrkey === 'template' &&
            _.isString(value[commandAttrkey])) {
            value[commandAttrkey] = handlebars.compile(value[commandAttrkey]);
          }
        }
      );
    }
  });

  if (dataTasks.length > 0 && bot.schedule) {
    normalizedCommand['SCHEDULE'] = {
      allowedParam: _.concat(dataTasks, ['LIST']),
      commandType: 'SCHEDULE',
    };

    stopTasks.push('SCHEDULE');
  }

  if (stopTasks.length > 0) {
    normalizedCommand['STOP'] = normalizedCommand['STOP'] ?
      normalizedCommand['STOP'] : {};
    normalizedCommand['STOP'].allowedParam = stopTasks;
    normalizedCommand['STOP'].commandType = 'KILL';
  }

  bot.botCommand = normalizedCommand;

  internals.mergeAllowedUsers(bot);

  return bot;
};

/**
* Function to merge allowed users and allowed user at the command level.
*
* @param {object} bot bot config.
*/
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
