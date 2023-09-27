'use strict';

// Load modules
import * as lodash from 'lodash-es';
import { parse } from 'url';
import { ok } from 'assert';

import logger from './utils/logger.js';
import { Bots } from './bot/bots.js';
import { connect } from './bot/socket-server.js';
import * as Socket from './bot/socket.js';
import { setupServer as _setupServer } from './bot/server.js';
import { Storage } from './storage/storage.js';

const DEFAULT_CONFIG = {
  defaultConfig: {
    slackBotRoot: {
      slack: {
        rootUri: 'slack.com',
        rtmStartApi: '/api/rtm.start',
      },
    },
  },
};
const {
  cloneDeep,
  get,
  split,
  nth,
  isEmpty,
  forEach,
  includes,
  toUpper,
  isUndefined,
} = lodash;

/**
 *
 * Represents the state and methods for SlackBot.
 *
 */
const SlackBot = class {
  /**
   * Creates a new Bot instance.
   * @param {object} options all config for bot. Refer Readme for schema.
   * @param {object} settings holds mock settings.
   * @param {object} settings.isMock true or false. starts the bots in mock mode.
   * @class
   */
  constructor(options, settings) {
    this.config = Object.assign(
      DEFAULT_CONFIG.defaultConfig.slackBotRoot,
      cloneDeep(options)
    );
    this.settings = settings;

    this.assertInputData(this.config, settings);

    Storage.createEventDirectory();
    logger.setLogger(this.config.logger);

    this.bots = new Bots(this.config).getBots();
  }

  /**
   * Function to roll the ball.
   *
   * @return {object} Promise resolves to array of bot interface.
   */
  start() {
    if (this.config.server) {
      return this.setupServer(this.config)
        .then((server) => {
          return this.initializeBots(server);
        })
        .catch((err) => {
          logger.error('Failed setting up webhook server %j', err);
        });
    } else {
      if (get(this.settings, 'isMock')) {
        return connect()
          .then(() => {
            return this.initializeBots(null);
          })
          .catch((err) => {
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
  shutdown() {
    logger.info('Shutting down bot');

    this.bots.reduce((botInstances, bot) => {
      return bot.shutdown();
    }, Promise.resolve());
  }

  /**
   * Function to setup http hook server for webhook.
   * @param {config} config for http server.
   * @return {object} Promise resolves to http server instance.
   */
  setupServer(config) {
    if (config.server) {
      return _setupServer(config.server, (request, response) => {
        this.handleRoutes.call(this, request, response);
      });
    }
  }

  /**
   * Function to handle routes to http server.
   * @param {object} request http request object.
   * @param {object} response http response object.
   */
  handleRoutes(request, response) {
    const urlParts = parse(request.url);
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
  selectRoutes(route, requestBody, request, response) {
    const paths = split(route.pathname, '/');
    const appRoute = nth(paths, 1);

    if (
      appRoute === 'hook' &&
      request.method === 'POST' &&
      !isEmpty(this.bots)
    ) {
      const botId = nth(paths, 2);
      const purposeId = nth(paths, 3);
      forEach(this.bots, (bot) => {
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
  respondToHook(responeBody, response) {
    if (responeBody && responeBody.error) {
      response.end(
        JSON.stringify({
          error: responeBody.error,
        })
      );
      return;
    }

    response.end('{ "response": "ok" }');
  }

  /**
   * Function to initialize bot config.
   * @param {object} server hook http server instance.
   * @return {object} promise resolves to array of bot interface.
   */
  initializeBots(server) {
    const botList = [];

    return this.bots.reduce((promiseItem, bot, index) => {
      if (bot.config.webHook) {
        bot.server = server;
      }

      return this.connectToSlack(promiseItem, bot)
        .then((botInterface) => {
          botList.push(botInterface);
          if (index === this.bots.length - 1) {
            return botList;
          }
        })
        .catch((err) => {
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
  closeSocketSession(botInstances, bot) {
    return botInstances
      .then(function () {
        Socket.closeConnection(bot);
      })
      .catch(function (err) {
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
  connectToSlack(botInstances, bot) {
    return botInstances
      .then(() => {
        return bot.init();
      })
      .catch(function (err) {
        logger.info('Failed to connect to slack ', err);
      });
  }

  /**
   * Function to handle connection for each bot.
   *
   * @param {object} config all config for bot. Refer Readme for schema.
   * @param {object} settings holds mock settings.
   */
  assertInputData(config, settings) {
    ok(config.bots, 'Invalid or empty config passed. Refer link here');
    ok(config.bots.length > 0, 'Bots cannot be empty. Refer link here');
    forEach(config.bots, function (bot) {
      if (!get(settings, 'isMock')) {
        delete bot.mock;
      }

      ok(
        !isEmpty(bot.botToken),
        'Bot need to have bot token. Refer github docs.'
      );

      ok(
        !isEmpty(bot.botCommand),
        'Bot need to have atleast one command. Refer github docs.'
      );

      ok(
        !isEmpty(bot.botCommand),
        'Bot need to have atleast one command. Refer github docs.'
      );

      forEach(bot.botCommand, function (botCommand, key) {
        ok(
          !isEmpty(botCommand.commandType),
          'Each bot should have command type. Bot: ' +
            bot.name +
            ' Key: ' +
            key +
            ' Refer github docs.'
        );

        ok(
          includes(
            ['DATA', 'RECURSIVE', 'KILL', 'ALERT', 'FLOW'],
            toUpper(botCommand.commandType)
          ),
          'Unrecognized bot command type. Only "data",' +
            ' "recursive", "alert", "kill" are supported'
        );

        if (includes(['ALERT'], toUpper(botCommand.commandType))) {
          ok(
            !isUndefined(botCommand.timeInterval),
            'Bot command of type "alert" should have timeInterval'
          );
        }
      });
    });
  }
};

export default SlackBot;
