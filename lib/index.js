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
const url = require('url');
const assert = require('assert');

const botLogger = require('./utils/logger');
const Bots = require('./bot/bots');
const Connector = require('./bot/connector');
const socket = require('./bot/socket');
const server = require('./bot/server');
const socketServer = require('./bot/socket-server');
const storage = require('./storage/storage');

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
  constructor (options, settings) {
    this.config = Object.assign(internals.defaultConfig.slackBotRoot, options);
    botLogger.setLogger(this.config.logger);
    storage.createEventDirectory();
    botLogger.logger.info('Index: config passed');
    this.assertInputData(this.config, settings);
    this.bots = new Bots(this.config.bots).getBots();
    botLogger.logger.debug('Index: this.bots', this.bots);
  }

  start() {
    botLogger.logger.info('Index: contacting slack for connection');
    if (this.config.server) {
      return this.setupServer(this.config, (err, server) => {
        this.server = server;
        return this.initializeBots(server);
      });
    } else {
      return this.initializeBots(null);
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
            bot.handleHookRequest(purposeId, responeBody, response);
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
    return this.bots.reduce((promiseItem, bot) => {
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
    }).catch(function (err) {
      botLogger.logger.info('Index: socket close failed', err);
    });
  }

  connectToSlack (promiseItem, bot) {
    return promiseItem.then(() => {
      botLogger.logger.info('Index: calling startRTM');
      return this.startRTM(bot);
    }).then(() => {
      return bot.setupBotChores(_.get(bot, 'config.mock'));
    }).catch((err) => {
      botLogger.logger.info('Index: failed reason', err);
    });
  }

  startRTM (bot) {
    if (_.get(bot, 'config.mock')) {
      return socketServer.connect(bot);
    }
    botLogger.logger.debug('Index: Connecting for bot %j', bot);
    bot.connectionManager = new Connector();
    return bot.connectionManager.connect(bot);
  }

  assertInputData (config, settings) {
    assert.ok(config.bots, 'Invalid or empty config passed. Refer link here');
    assert.ok(config.bots.length > 0, 'Bots cannot be empty. Refer link here');
    _.forEach(config.bots, function(bot) {

      if (!_.get(settings, 'isMock')) {
        delete bot.mock;
      }
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
