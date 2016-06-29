/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const url = require('url');
const assert = require('assert');
const _ = require('lodash');

const Bots = require('./bot/bots');
const connector = require('./connector');
const socket = require('./bot/socket');
const server = require('./bot/server');

const botLogger = require('./../lib/utils/logger');
const storage = require('./../lib/storage/storage');

const externals = {};

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

externals.SlackBot = class {
  constructor (options) {
    this.config = Object.assign(internals.defaultConfig.slackBotRoot, options);
    botLogger.setLogger(this.config.logger);
    storage.createEventDirectory();
    botLogger.logger.info('Index: config passed');
    this.assertInputData(this.config);
    this.bots = new Bots(this.config.bots).getBots();
    botLogger.logger.debug('Index: this.bots', this.bots);
  }

  start() {
    botLogger.logger.info('Index: contacting slack for connection');

    if (this.config.server) {
      this.setupServer.call(this, this.config, (err, server) => {
        this.server = server;
        this.initializeBots.call(this, server);
      });
    } else {
      this.initializeBots.call(this);
    }
  }

  shutdown() {
    botLogger.logger.info('Index: shutting down bot');
    this.bots.reduce((promiseItem, bot) => {
      botLogger.logger.debug('Index: shutting down for', bot);
      return this.closeSocketSession(promiseItem, bot);
    }, Promise.resolve());
  }

  setupServer(config, callback) {
    botLogger.logger.info('Index: setting up server');
    if (config.server) {
      server.setupServer(config.server, (request, response) => {
        this.handleRoutes.call(this, request, response);
      }, (err, server) => {
        if (err) {
          botLogger.logger.info('Index: server start up failed', err);
        }
        botLogger.logger.info('Index: server started at ', server.address());
        callback(null, server);
      });
    }
  }

  handleRoutes (request, response) {
    let urlParts = url.parse(request.url);
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      let responeBody = {};
      try {
        responeBody = JSON.parse(body);
      } catch (e) {
        responeBody.text = body;
      }
      this.selectRoutes(urlParts, responeBody, request, response);
    });
  }

  selectRoutes (route, responeBody, request, response) {
    let paths = _.split(route.pathname, '/');
    let appRoute = _.nth(paths, 1);
    if (appRoute === 'hook' &&
      request.method === 'POST' &&
      !_.isEmpty(this.bots)) {
        let botId = _.nth(paths, 2);
        let purposeId = _.nth(paths, 3);
        _.forEach(this.bots, (bot) => {
          if (botId === bot.id) {
            bot.eventEmitter.emit('hookCast',
              purposeId,
              responeBody,
              response,
              this.respondToHook);
          }
        });
    } else {
      response.end('{ "error": "unkown error" }');
    }
  }

  respondToHook (responeBody, response) {
    if (responeBody && responeBody.error) {
      response.end(JSON.stringify({ error: responeBody.error }));
      return;
    }
    response.end('{ "response": "ok" }');
  }

  initializeBots (server) {
    this.bots.reduce((promiseItem, bot) => {
      botLogger.logger.debug('Index: Creating promise for', bot);
      if (bot.config.webHook) {
        bot.server = server;
      }
      return this.connectToSlack(promiseItem, bot);
    }, Promise.resolve());
  }

  closeSocketSession (promiseItem, bot) {
    return promiseItem.then(function () {
      botLogger.logger.info('Index: closing socket connection');
      socket.closeConnection(bot);
    }).catch(function (err, reason) {
      botLogger.logger.info('Index: socket close failed', err);
      botLogger.logger.info('Index: socket close failed reason', reason);
    });
  }

  connectToSlack (promiseItem, bot) {
    return promiseItem.then(() => {
      botLogger.logger.info('Index: calling startRTM');
      return this.startRTM(bot);
    }).then(function (slackResponse) {
      botLogger.logger.info('Index: calling create socket');
      socket.createSocket(slackResponse);
    }).catch(function (err, reason) {
      botLogger.logger.info('Index: error', err);
      botLogger.logger.info('Index: failed reason', reason);
    });
  }

  startRTM (bot) {
    botLogger.logger.debug('Index: Connecting for bot %j', bot);
    return connector.connect(bot);
  }

  assertInputData (config) {
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
  }
};

module.exports = externals.SlackBot;
