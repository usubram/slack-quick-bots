/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');
var Bot = require('./bot');
var botLogger = require('./../../lib/utils/logger');

var externals = {};
var internals = {
  config: {
    bots: []
  },
  alertParams: ['sample', 'setup']
};

externals.Bots = function () {
  function _class(bots) {
    _classCallCheck(this, _class);

    this.bots = [];
    internals.config.bots = bots;
    internals.init(this.bots);
    return this;
  }

  _createClass(_class, [{
    key: 'getBots',
    value: function getBots() {
      return this.bots;
    }
  }]);

  return _class;
}();

internals.init = function (bots) {
  _.forEach(internals.config.bots, function (bot) {
    var newbot = new Bot(internals.normalizeCommand(bot));
    if (newbot) {
      botLogger.logger.info('Bots: Bot instantiated correctly');
      bots.push(newbot);
    } else {
      botLogger.logger.warn('Bots: Error creating bot object,' + 'something bad with this bot config %j', bot);
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
      _.forEach(value, function (commandAttr, commandAttrkey) {
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