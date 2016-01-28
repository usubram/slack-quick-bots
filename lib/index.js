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

const Bots = require('./bot/bots');
const connector = require('./connector');
const socket = require('./bot/socket');

const botLogger = require('./../utils/logger');
const env = require('./../utils/environment');

const internals = {};

internals.defaultConfig = {
  slackBotRoot: {
    slack: {
      rootUri: 'slack.com',
      rtmStartApi: '/api/rtm.start'
    }
  }
};

exports = module.exports = internals.SlackBot = function (options) {
  this.config = Object.assign(internals.defaultConfig.slackBotRoot, options);
  botLogger.setLogger(this.config.logger);
  botLogger.logger.info('Index: config passed');

  this._assertInputData(this.config);
  this.bots = new Bots(this.config.bots).getBots();

  if (env.dev) {
    botLogger.logger.info('Index: this.bots', this.bots);
  }
};

internals.SlackBot.prototype.start = function () {
  var context = this;
  botLogger.logger.info('Index: contacting slack for connection');
  this.bots.reduce(function (promiseItem, bot) {
    if (env.dev) {
      botLogger.logger.info('Index: Creating promise for', bot);
    }
    return context._connectToSlack(promiseItem, bot);
  }, Promise.resolve());
};

internals.SlackBot.prototype._connectToSlack = function (promiseItem, bot) {
  var context = this;
  return promiseItem.then(function () {
    botLogger.logger.info('Index: calling startRTM');
    return context._startRTM(bot);
  }).then(function (slackResponse) {
    botLogger.logger.info('Index: calling create socket');
    socket.createSocket(slackResponse);
  }).catch( function (err, reason) {
    botLogger.logger.info('Index: error', err);
    botLogger.logger.info('Index: failed reason', reason);
  });
};

internals.SlackBot.prototype._startRTM = function (bot) {
  if (env.dev) {
    botLogger.logger.info('Index: Connecting for bot %j', bot);
  }
  return connector.connect(bot);
};

/*
 TODO: This is a very basic validation. Improve this
 into more manageable approach.
*/
internals.SlackBot.prototype._assertInputData = function(config) {
  assert.ok(config.bots, 'Invalid or empty config passed. Refer link here');
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

        assert.ok(_.includes(['data', 'recursive', 'kill', 'alert'],
            _.camelCase(botCommand.commandType)),
        'Unrecognized bot command type. Only "data", "recursive", "kill" are supported');

        if (_.includes(['data', 'recursive'], _.camelCase(botCommand.commandType))) {
          assert.ok(!_.isUndefined(botCommand.defaultParamValue), 
            'Bot command of type "data" or "recursive" should have defaultParamValue');
        }

    });
  });
};
