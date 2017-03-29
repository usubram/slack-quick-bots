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
const socketServer = require('./bot/socket-server');
const socket = require('./bot/socket');
const server = require('./bot/server');
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
    this.settings = settings;

    this.assertInputData(this.config, settings);

    storage.createEventDirectory();
    botLogger.setLogger(this.config.logger);

    this.bots = new Bots(this.config).getBots();
  }

  start() {

    if (this.config.server) {
      return this.setupServer(this.config).then((server) => {
        return this.initializeBots(server);
      }).catch((err) => {
        botLogger.logger.error('Failed setting up webhook server %j', err);
      });
    } else {
      if (_.get(this.settings, 'isMock')) {
        return socketServer.connect().then(() => {
          return this.initializeBots(null);
        }).catch((err) => {
          botLogger.logger.log('Failed starting bot in mock mode %j', err);
        });
      }

      return this.initializeBots(null);
    }
  }

  shutdown() {
    botLogger.logger.info('Shutting down bot');

    this.bots.reduce((promiseItem, bot) => {
      return this.closeSocketSession(promiseItem, bot);
    }, Promise.resolve());
  }

  setupServer(config) {
    if (config.server) {
      return server.setupServer(config.server, (request, response) => {
        this.handleRoutes.call(this, request, response);
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
        if (botId === bot.getId()) {
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
    var botList = [];
    return this.bots.reduce((promiseItem, bot, index) => {
      if (bot.config.webHook) {
        bot.server = server;
      }

      return this.connectToSlack(promiseItem, bot).then((botInterface) => {
        botList.push(botInterface);
        if (index === this.bots.length - 1) {
          return botList;
        }
      }).catch(function (err) {
        botLogger.logger.errot('Unable to establish connection to slack %j', err);
      });

    }, Promise.resolve());
  }

  closeSocketSession (promiseItem, bot) {
    return promiseItem.then(function () {
      socket.closeConnection(bot);
    }).catch(function (err) {
      botLogger.logger.error('Closing bot failed ', err);
    });
  }

  connectToSlack (promiseItem, bot) {
    return promiseItem.then(() => {
      return bot.init();
    }).catch(function (err) {
      botLogger.logger.info('Failed to connect to slack ', err);
    });
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

        assert.ok(_.includes(['DATA', 'RECURSIVE', 'KILL', 'ALERT'],
          _.toUpper(botCommand.commandType)),
          'Unrecognized bot command type. Only "data", "recursive", "alert", "kill" are supported');

        if (_.includes(['ALERT'], _.toUpper(botCommand.commandType))) {
          assert.ok(!_.isUndefined(botCommand.timeInterval),
            'Bot command of type "alert" should have timeInterval');
        }

      });
    });
  }
};

module.exports = externals.SlackBot;
