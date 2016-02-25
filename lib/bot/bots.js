/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2015 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const botLogger = require('./../../utils/logger');
const _ = require('lodash');
const Bot = require('./bot');

const internals = {
  alertParams: ['sample', 'setup']
};

exports = module.exports = internals.Bots = function (bots) {
  internals.config = {};
  internals.config.bots = bots;
  this.bots = [];
  return this._init();
};

internals.Bots.prototype._init = function () {

  _.forEach(internals.config.bots, (bot) => {
    var newbot = new Bot(this._normalizeCommand(bot));
    if (newbot) {
      botLogger.logger.info('Bots: Bot instantiated correctly');
      this.bots.push(newbot);
    } else {
      botLogger.logger.warn('Bots: Error creating bot object,' +
        'something bad with this bot config %j', bot);
    }
  });
  botLogger.logger.info('Bots: All bots read completed');
  return this;
};

internals.Bots.prototype.getBots = function () {
  return this.bots;
};

internals.Bots.prototype._normalizeCommand = function (bot) {
  bot = _.reduce(bot, function (botItem, botValue, botkey) {
    if (botValue) {
      botItem[botkey] = botValue;
    }
    return botItem;
  }, {});
  var normalizedCommand = {};
  _.forEach(bot.botCommand, function (value, key) {
    if (value) {
      normalizedCommand[_.camelCase(key)] = value;
      _.forEach(value,
        function (commandAttr, key) {
        if (key === 'commandType') {
          value[key] = _.camelCase(commandAttr);
        } else if (key === 'parentTask') {
          value[key] = _.camelCase(commandAttr);
        }
        if (key === 'commandType' && _.camelCase(commandAttr) === 'alert') {
          value['allowedParam'] = internals.alertParams;
        }
      });
    }
  });
  bot.botCommand = normalizedCommand;
  return bot;
};
