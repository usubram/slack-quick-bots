/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2015 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const assert = require('assert');
const _ = require('lodash');
const extendify = require('extendify');

const Bots = require('./bot/bots');
const Connector = require('./connector');

const internals = {};

const socket = require('./bot/socket');

// Instantiate extendify
internals.CustomMerge = extendify({
  inPlace: false,
  isDeep: true,
  arrays : 'replace'
});

internals.defaultConfig = {
  slackBotRoot: {
    slack: {
      rootUri: 'slack.com',
      rtmStartApi: '/api/rtm.start'
    }
  }
};

exports = module.exports = internals.SlackBot = function (options) {
  this.slackBot = {};
  this.slackBot.ptask = [];
  this.slackBot.slackBotConfig = internals
    .CustomMerge(internals.defaultConfig.slackBotRoot, options);

  this._assertInputData(this.slackBot.slackBotConfig);
  this.slackBot.bots = new Bots(this.slackBot.slackBotConfig.bots).getBots();
};

internals.SlackBot.prototype.start = function() {
  this.slackBot.bots.reduce((promiseItem, bot) => {
    return promiseItem.then(() => {
      return Connector.connect(bot);
    }).then((botInfo) => {
      var socketPromise = socket(botInfo);
      socketPromise.then((data) => {
        this._startWebsocket(data);
      });
      return socketPromise;
    });
  }, Promise.resolve());
};

internals.SlackBot.prototype._startWebsocket = function(botInfo) {
  _.forEach(this.slackBot.bots, function(itemBot) {
    if (itemBot.bot.botName === botInfo.bot.botName) {
      itemBot.startWebSocketSession(botInfo);
      console.log('Bot: %s started...', itemBot.bot.botName);
    }
  });
};

/*
 TODO: This is a very basic validation. Improve this
 into more manageable approach.
*/
internals.SlackBot.prototype._assertInputData = function(config) {
  assert.ok(config.bots.length > 0, 'Bots cannot be empty. Refer link here');
  _.forEach(config.bots, function(bot) {
    
    assert.ok(!_.isEmpty(bot.botToken), 'Bot need to have bot token. Refer github docs.');
    
    assert.ok(!_.isEmpty(bot.botCommand),
      'Bot need to have atleast one command. Refer github docs.');
    
    assert.ok(!_.isEmpty(bot.botCommand),
      'Bot need to have atleast one command. Refer github docs.');

    _.forEach(bot.botCommand, function(botCommand, key) {
      
      assert.ok(!_.isEmpty(botCommand.commandType),
        'Each bot should have command type. Bot: '+ bot.name +
        ' Key: ' + key + ' Refer github docs.');

        assert.ok(_.includes(['data', 'recursive', 'kill'],
            _.camelCase(botCommand.commandType)),
        'Unrecognized bot command type. Only "data", "recursive", "kill" are supported');

        if (_.includes(['data', 'recursive'], _.camelCase(botCommand.commandType))) {
          assert.ok(!_.isUndefined(botCommand.defaultParamValue), 
            'Bot command of type "data" or "recursive" should have defaultParamValue');
        }

    });
  });
};
