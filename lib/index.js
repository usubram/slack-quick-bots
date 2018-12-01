/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2018 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

// Load modules
const _ = require('lodash');
const url = require('url');
const assert = require('assert');

const logger = require('./utils/logger');
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
        rtmStartApi: '/api/rtm.start',
      },
    },
  },
};

/**
*
* Represents the state and methods for SlackBot.
*
*/
externals.SlackBot = class {
  /**
  * Creates a new Bot instance.
  * @param {object} options all config for bot. Refer Readme for schema.
  * @param {object} settings holds mock settings.
  * @param {object} settings.isMock true or false. starts the bots in mock mode.
  * @class
  */
  constructor (options, settings) {
    this.config = Object.assign(internals.defaultConfig.slackBotRoot,
      _.cloneDeep(options));
    this.settings = settings;

    this.assertInputData(this.config, settings);

    storage.createEventDirectory();
    logger.setLogger(this.config.logger);

    this.bots = new Bots(this.config).getBots();
  }

  /**
  * Function to roll the ball.
  *
  * @return {object} Promise resolves to array of bot interface.
  */
  start () {
    if (this.config.server) {
      return this.setupServer(this.config).then((server) => {
        return this.initializeBots(server);
      }).catch((err) => {
        logger.error('Failed setting up webhook server %j', err);
      });
    } else {
      if (_.get(this.settings, 'isMock')) {
        return socketServer.connect().then(() => {
          return this.initializeBots(null);
        }).catch((err) => {
          logger.error('Failed starting bot in mock mode %j', err);
        });
      }

      return this.initializeBots(null);
    }
  }

  /**
  * Function to shutdown all bots.
  *
  */
  shutdown () {
    logger.info('Shutting down bot');

    this.bots.reduce((botInstances, bot) => {
      return this.closeSocketSession(botInstances, bot);
    }, Promise.resolve());
  }

  /**
  * Function to setup http hook server for webhook.
  * @param {config} config for http server.
  * @return {object} Promise resolves to http server instance.
  */
  setupServer (config) {
    if (config.server) {
      return server.setupServer(config.server, (request, response) => {
        this.handleRoutes.call(this, request, response);
      });
    }
  }

  /**
  * Function to handle routes to http server.
  * @param {object} request http request object.
  * @param {object} response http response object.
  */
  handleRoutes (request, response) {
    const urlParts = url.parse(request.url);
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      let requestBody = {};

      try {
        requestBody = JSON.parse(body);
      } catch (e) {
        requestBody.text = body;
      }

      this.selectRoutes(urlParts, requestBody, request, response);
    });
  }

  /**
  * Function to select route for hook request.
  * @param {object} route standard url object.
  * @param {object} requestBody request payload.
  * @param {object} request http request object.
  * @param {object} response http response object.
  */
  selectRoutes (route, requestBody, request, response) {
    const paths = _.split(route.pathname, '/');
    const appRoute = _.nth(paths, 1);

    if (appRoute === 'hook' &&
      request.method === 'POST' &&
      !_.isEmpty(this.bots)) {
      const botId = _.nth(paths, 2);
      const purposeId = _.nth(paths, 3);
      _.forEach(this.bots, (bot) => {
        if (botId === bot.getId()) {
          bot.handleHookRequest(purposeId, requestBody, response);
        }
      });
    } else {
      response.end('{ "error": "unkown error" }');
    }
  }

  /**
  * Function to respond to hook request.
  * @param {object} responeBody response payload.
  * @param {object} response http response object.
  */
  respondToHook (responeBody, response) {
    if (responeBody && responeBody.error) {
      response.end(JSON.stringify({
        error: responeBody.error,
      }));
      return;
    }

    response.end('{ "response": "ok" }');
  }

  /**
  * Function to initialize bot config.
  * @param {object} server hook http server instance.
  * @return {object} promise resolves to array of bot interface.
  */
  initializeBots (server) {
    const botList = [];

    return this.bots.reduce((promiseItem, bot, index) => {
      if (bot.config.webHook) {
        bot.server = server;
      }

      return this.connectToSlack(promiseItem, bot).then((botInterface) => {
        botList.push(botInterface);
        if (index === this.bots.length - 1) {
          return botList;
        }
      }).catch((err) => {
        logger.error('Unable to establish connection to slack %j', err);
      });
    }, Promise.resolve());
  }

  /**
  * Function to shutdown all bot connections.
  *
  * @param {object} botInstances bot instances.
  * @param {object} bot current instance in context.
  * @return {object} promise resolves success or failure.
  */
  closeSocketSession (botInstances, bot) {
    return botInstances.then(function () {
      socket.closeConnection(bot);
    }).catch(function (err) {
      logger.error('Closing bot failed ', err);
    });
  }

  /**
  * Function to handle connection for each bot.
  *
  * @param {object} botInstances bot instances.
  * @param {object} bot current instance in context.
  * @return {object} promise resolves success or failure.
  */
  connectToSlack (botInstances, bot) {
    return botInstances.then(() => {
      return bot.init();
    }).catch(function (err) {
      logger.info('Failed to connect to slack ', err);
    });
  }

  /**
  * Function to handle connection for each bot.
  *
  * @param {object} config all config for bot. Refer Readme for schema.
  * @param {object} settings holds mock settings.
  */
  assertInputData (config, settings) {
    assert.ok(config.bots, 'Invalid or empty config passed. Refer link here');
    assert.ok(config.bots.length > 0, 'Bots cannot be empty. Refer link here');
    _.forEach(config.bots, function (bot) {
      if (!_.get(settings, 'isMock')) {
        delete bot.mock;
      }

      assert.ok(!_.isEmpty(bot.botToken),
        'Bot need to have bot token. Refer github docs.');

      assert.ok(!_.isEmpty(bot.botCommand),
        'Bot need to have atleast one command. Refer github docs.');

      assert.ok(!_.isEmpty(bot.botCommand),
        'Bot need to have atleast one command. Refer github docs.');

      _.forEach(bot.botCommand, function (botCommand, key) {
        assert.ok(!_.isEmpty(botCommand.commandType),
          'Each bot should have command type. Bot: '+ bot.name +
          ' Key: ' + key + ' Refer github docs.');

        assert.ok(_.includes(['DATA', 'RECURSIVE', 'KILL', 'ALERT'],
          _.toUpper(botCommand.commandType)),
        'Unrecognized bot command type. Only "data",' +
          ' "recursive", "alert", "kill" are supported');

        if (_.includes(['ALERT'], _.toUpper(botCommand.commandType))) {
          assert.ok(!_.isUndefined(botCommand.timeInterval),
            'Bot command of type "alert" should have timeInterval');
        }
      });
    });
  }
};

module.exports = externals.SlackBot;
