'use strict';

// Load modules
const _ = require('lodash');
const Bot = require('./bot');

const internals = {};

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
      this.bots.push(newbot);
    }
  });
  return this;
};

internals.Bots.prototype.getBots = function() {
  return this.bots;
};

internals.Bots.prototype._normalizeCommand = function(bot) {
  bot = _.reduce(bot, function(botItem, botValue, botkey) {
    if (botkey === 'defaultCommandPrefix') {
      botItem[botkey] = _.camelCase(botValue);
    } else {
      if (botValue) {
        botItem[botkey] = botValue;
      }
    }
    return botItem;
  }, {});
  var normalizedCommand = {};
  _.forEach(bot.botCommand, function(value, key) {
    if (value) {
      normalizedCommand[_.camelCase(key)] = value;
      _.forEach(value,
        function(commandAttr, key) {
        if (key === 'commandType') {
          value[key] = _.camelCase(commandAttr);
        } else if (key === 'parentTask') {
          value[key] = _.camelCase(commandAttr);
        }
      });
    }
  });
  bot.botCommand = normalizedCommand;
  return bot;
};
