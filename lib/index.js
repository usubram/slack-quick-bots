/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const http = require('http');
const url = require('url');
const assert = require('assert');
const _ = require('lodash');

const Bots = require('./bot/bots');
const connector = require('./connector');
const socket = require('./bot/socket');
const server = require('./bot/server');

const botLogger = require('./../lib/utils/logger');
const env = require('./../lib/utils/environment');

const internals = {
  defaultConfig: {
    slackBotRoot: {
      slack: {
        rootUri: 'slack.com',
        rtmStartApi: '/api/rtm.start'
      }
    }
  }
};

exports = module.exports = internals.SlackBot = function (options) {
  this.config = Object.assign(internals.defaultConfig.slackBotRoot, options);
  botLogger.setLogger(this.config.logger);
  botLogger.logger.info('Index: config passed');

  internals.assertInputData(this.config);
  this.bots = new Bots(this.config.bots).getBots();

  if (env.dev) {
    botLogger.logger.info('Index: this.bots', this.bots);
  }
};

internals.SlackBot.prototype.start = function () {
  botLogger.logger.info('Index: contacting slack for connection');

  if (this.config.server) {
    internals.setupServer.call(this, this.config, (err, server) => {
      this.server = server;
      internals.initializeBots.call(this, server);
    });
  } else {
    internals.initializeBots.call(this);
  }
};

internals.SlackBot.prototype.shutdown = function () {
  botLogger.logger.info('Index: shutting down bot');
  this.bots.reduce(function (promiseItem, bot) {
    if (env.dev) {
      botLogger.logger.info('Index: shutting down for', bot);
    }
    return internals.closeSocketSession(promiseItem, bot);
  }, Promise.resolve());
};

internals.setupServer = function (config, callback) {
  botLogger.logger.info('Index: setting up server');
  if (config.server) {
    server.setupServer(config.server, (request, response) => {
      internals.handleRoutes.call(this, request, response);
    }, (err, server) => {
      if (err) {
        botLogger.logger.info('Index: server start up failed', err);
      };
      botLogger.logger.info('Index: server started at ', server.address());
      callback(null, server);
    });
  }
};

internals.handleRoutes = function (request, response) {
  var url_parts = url.parse(request.url);
  var paths = url_parts.pathname.split('/');
  var body = "";
  request.on('data', function (chunk) {
    body += chunk;
  });
  request.on('end', () => {
    var responeBody = {};
    try {
      responeBody = JSON.parse(body);
    } catch (e) {
      responeBody.text = body;
    }
    internals.selectRoutes(this, url_parts, responeBody, request, response)
  });
};

internals.selectRoutes = function (context, route, responeBody, request, response) {
  var paths = _.split(route.pathname, '/');
  var appRoute = _.nth(paths, 1);
  if (appRoute === 'hook' &&
    request.method === 'POST' &&
    !_.isEmpty(context.bots)) {
      var botId = _.nth(paths, 2);
      var purposeId = _.nth(paths, 3);
      _.forEach(context.bots, (bot) => {
        if (botId === bot.id) {
          bot.eventEmitter.emit('hookCast',
            purposeId,
            responeBody,
            response,
            internals.respondToHook);
        }
      });
  } else {
    response.end('{ "error": "unkown error" }');
  }
};

internals.respondToHook = function (responeBody, response) {
  if (responeBody && responeBody.error) {
    response.end(JSON.stringify({ error: responeBody.error }));
    return;
  }
  response.end('{ "response": "ok" }');
};

internals.initializeBots = function (server) {
  this.bots.reduce((promiseItem, bot) => {
    if (env.dev) {
      botLogger.logger.info('Index: Creating promise for', bot);
    }
    if (bot.config.webHook) {
      bot.server = server;
    }
    return internals.connectToSlack(promiseItem, bot);
  }, Promise.resolve());
};

internals.closeSocketSession = function (promiseItem, bot) {
  return promiseItem.then(function () {
    botLogger.logger.info('Index: closing socket connection');
    socket.closeConnection(bot);
  }).catch(function (err, reason) {
    botLogger.logger.info('Index: socket close failed', err);
    botLogger.logger.info('Index: socket close failed reason', reason);
  });
};

internals.connectToSlack = function (promiseItem, bot) {
  return promiseItem.then(function () {
    botLogger.logger.info('Index: calling startRTM');
    return internals.startRTM(bot);
  }).then(function (slackResponse) {
    botLogger.logger.info('Index: calling create socket');
    socket.createSocket(slackResponse);
  }).catch(function (err, reason) {
    botLogger.logger.info('Index: error', err);
    botLogger.logger.info('Index: failed reason', reason);
  });
};

internals.startRTM = function (bot) {
  if (env.dev) {
    botLogger.logger.info('Index: Connecting for bot %j', bot);
  }
  return connector.connect(bot);
};

/*
 TODO: This is a very basic validation. Improve this
 into more manageable approach.
*/
internals.assertInputData = function(config) {
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
        'Unrecognized bot command type. Only "data", "recursive", "alert", "kill" are supported');

        if (_.includes(['alert'], _.camelCase(botCommand.commandType))) {
          assert.ok(!_.isUndefined(botCommand.timeInterval), 
            'Bot command of type "alert" should have timeInterval');
        }

    });
  });
};
