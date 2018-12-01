/**
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2018 Umashankar Subramanian
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
  alertParams: ['setup', 'list'],
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
  const normalizedCommand = {};
  const stopTasks = [];
  const dataTasks = [];

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
                if (_.get(value, 'validation', []).length === 0) {
                  value.validation = [{
                    schema: [internals.alertParams],
                    help: [{
                      recommend: 'setup',
                      error: 'Invalid arguments. Alert command should follow'
                        + ' setup and a valid threshold value',
                    }],
                  }];
                }
              }

              stopTasks.push(commandKey);
            }
          } else if (commandAttrkey === 'parentTask') {
            value[commandAttrkey] = command;
          } else if (commandAttrkey === 'template' &&
            _.isString(value[commandAttrkey])) {
            value[commandAttrkey] = handlebars.compile(value[commandAttrkey]);
          } else if (commandAttrkey === 'validation') {
            value[commandAttrkey] = _.map(value[commandAttrkey],
              (validation) => {
                if (validation.help) {
                  validation.help = _.map(validation.help, (validationHelp) => {
                    return _.merge(validationHelp,
                      {error: handlebars.compile(validationHelp.error)});
                  });
                }

                return validation;
              });
          }
        }
      );
    }
  });

  if (dataTasks.length > 0 && bot.schedule) {
    normalizedCommand['SCHEDULE'] = {
      validation: [{
        schema: _.concat(dataTasks, ['LIST']),
        help: [{
          recommend: _.concat(dataTasks, ['LIST']),
          sample: '{command name} {command args if any} {cron expression}',
          error: 'Invalid scehdule command. Use the existing commands ' +
            'and it arguments followed by cron expression. Like ' +
             'schedule {command} {args..} (*/15 * * * *)',
        }],
      }],
      descriptionText: 'Use this command to schedule any command the supports',
      helpText: '☞  Try {commandName} (*/15 * * * *) for run a command ' +
        'for every 15 mins',
      commandType: 'SCHEDULE',
    };

    stopTasks.push('SCHEDULE');
  }

  if (stopTasks.length > 0) {
    normalizedCommand['STOP'] = normalizedCommand['STOP'] ?
      normalizedCommand['STOP'] : {};
    _.merge(normalizedCommand['STOP'], {
      validation: [{
        schema: [stopTasks],
        help: [{
          recommend: stopTasks,
          sample: '{command name}',
          error: 'Enter a valid command to stop. It should be ' +
            _.join(stopTasks, ' or '),
        }],
      }],
      descriptionText: 'Use this command to stop scheduled or alert command',
      helpText: '☞  Try stop {command name} to stop a command. ' +
        'stop {command name} {scheduleId/alertId} for schedule/alert command',
      commandType: 'KILL',
    });
  }

  bot.botCommand = normalizedCommand;

  internals.mergeAllowedUsers(bot);
  internals.mergeAllowedChannels(bot);

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

/**
* Function to merge allowed channels and allowed channels at the command level.
*
* @param {object} bot bot config.
*/
internals.mergeAllowedChannels = function (bot) {
  if (bot.allowedChannels) {
    _.forEach(bot.botCommand, function (command) {
      if (!command.allowedChannels) {
        command.allowedChannels = _.uniq(bot.allowedChannels);
      }
    });
  }
};

module.exports = externals.Bots;
