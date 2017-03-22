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
var url = require('url');
var assert = require('assert');

var botLogger = require('./utils/logger');
var Bots = require('./bot/bots');
var socketServer = require('./bot/socket-server');
var socket = require('./bot/socket');
var server = require('./bot/server');
var storage = require('./storage/storage');

var externals = {};

var internals = {
  defaultConfig: {
    slackBotRoot: {
      slack: {
        rootUri: 'slack.com',
        rtmStartApi: '/api/rtm.start'
      }
    }
  }
};

externals.SlackBot = function () {
  function _class(options, settings) {
    _classCallCheck(this, _class);

    this.config = Object.assign(internals.defaultConfig.slackBotRoot, options);
    this.settings = settings;

    this.assertInputData(this.config, settings);

    storage.createEventDirectory();
    botLogger.setLogger(this.config.logger);

    this.bots = new Bots(this.config.bots).getBots();

    botLogger.logger.info('Index: config passed');
    botLogger.logger.debug('Index: this.bots', this.bots);
  }

  _createClass(_class, [{
    key: 'start',
    value: function start() {
      var _this = this;

      botLogger.logger.info('Index: contacting slack for connection');

      if (this.config.server) {
        return this.setupServer(this.config).then(function (server) {
          return _this.initializeBots(server);
        }).catch(function (err) {
          botLogger.logger.debug('Index: Failed setting up server %j', err);
        });
      } else {
        if (_.get(this.settings, 'isMock')) {
          return socketServer.connect().then(function () {
            return _this.initializeBots(null);
          }).catch(function (err) {
            botLogger.logger.log('Index: Failed mock start up %j', err);
          });
        }

        return this.initializeBots(null);
      }
    }
  }, {
    key: 'shutdown',
    value: function shutdown() {
      var _this2 = this;

      botLogger.logger.info('Index: shutting down bot');
      this.bots.reduce(function (promiseItem, bot) {
        botLogger.logger.debug('Index: shutting down for', bot);
        return _this2.closeSocketSession(promiseItem, bot);
      }, Promise.resolve());
    }
  }, {
    key: 'setupServer',
    value: function setupServer(config) {
      var _this3 = this;

      botLogger.logger.info('Index: setting up server', config.server);
      if (config.server) {
        botLogger.logger.info('Index: setupServer');
        return server.setupServer(config.server, function (request, response) {
          _this3.handleRoutes.call(_this3, request, response);
        });
      }
    }
  }, {
    key: 'handleRoutes',
    value: function handleRoutes(request, response) {
      var _this4 = this;

      var urlParts = url.parse(request.url);
      var body = '';
      request.on('data', function (chunk) {
        body += chunk;
      });
      request.on('end', function () {
        var responeBody = {};
        try {
          responeBody = JSON.parse(body);
        } catch (e) {
          responeBody.text = body;
        }
        _this4.selectRoutes(urlParts, responeBody, request, response);
      });
    }
  }, {
    key: 'selectRoutes',
    value: function selectRoutes(route, responeBody, request, response) {
      var paths = _.split(route.pathname, '/');
      var appRoute = _.nth(paths, 1);
      if (appRoute === 'hook' && request.method === 'POST' && !_.isEmpty(this.bots)) {
        var botId = _.nth(paths, 2);
        var purposeId = _.nth(paths, 3);
        _.forEach(this.bots, function (bot) {
          if (botId === bot.getId()) {
            bot.handleHookRequest(purposeId, responeBody, response);
          }
        });
      } else {
        response.end('{ "error": "unkown error" }');
      }
    }
  }, {
    key: 'respondToHook',
    value: function respondToHook(responeBody, response) {
      if (responeBody && responeBody.error) {
        response.end(JSON.stringify({ error: responeBody.error }));
        return;
      }
      response.end('{ "response": "ok" }');
    }
  }, {
    key: 'initializeBots',
    value: function initializeBots(server) {
      var _this5 = this;

      var botList = [];
      return this.bots.reduce(function (promiseItem, bot, index) {
        botLogger.logger.debug('Index: Creating promise for %j', bot);
        if (bot.config.webHook) {
          bot.server = server;
        }

        return _this5.connectToSlack(promiseItem, bot).then(function (botInterface) {
          botList.push(botInterface);
          if (index === _this5.bots.length - 1) {
            return botList;
          }
        }).catch(function (err) {
          botLogger.logger.debug('Index: Connection to slack failed %j', err);
        });
      }, Promise.resolve());
    }
  }, {
    key: 'closeSocketSession',
    value: function closeSocketSession(promiseItem, bot) {
      return promiseItem.then(function () {
        botLogger.logger.info('Index: closing socket connection');
        socket.closeConnection(bot);
      }).catch(function (err) {
        botLogger.logger.info('Index: socket close failed', err);
      });
    }
  }, {
    key: 'connectToSlack',
    value: function connectToSlack(promiseItem, bot) {
      return promiseItem.then(function () {
        botLogger.logger.info('Index: calling startRTM');
        return bot.init();
      }).catch(function (err) {
        botLogger.logger.info('Index: connectToSlack failed', err.stack);
      });
    }
  }, {
    key: 'assertInputData',
    value: function assertInputData(config, settings) {
      assert.ok(config.bots, 'Invalid or empty config passed. Refer link here');
      assert.ok(config.bots.length > 0, 'Bots cannot be empty. Refer link here');
      _.forEach(config.bots, function (bot) {

        if (!_.get(settings, 'isMock')) {
          delete bot.mock;
        }
        assert.ok(!_.isEmpty(bot.botToken), 'Bot need to have bot token. Refer github docs.');

        assert.ok(!_.isEmpty(bot.botCommand), 'Bot need to have atleast one command. Refer github docs.');

        assert.ok(!_.isEmpty(bot.botCommand), 'Bot need to have atleast one command. Refer github docs.');

        _.forEach(bot.botCommand, function (botCommand, key) {

          assert.ok(!_.isEmpty(botCommand.commandType), 'Each bot should have command type. Bot: ' + bot.name + ' Key: ' + key + ' Refer github docs.');

          assert.ok(_.includes(['DATA', 'RECURSIVE', 'KILL', 'ALERT'], _.toUpper(botCommand.commandType)), 'Unrecognized bot command type. Only "data", "recursive", "alert", "kill" are supported');

          if (_.includes(['alert'], _.toUpper(botCommand.commandType))) {
            assert.ok(!_.isUndefined(botCommand.timeInterval), 'Bot command of type "alert" should have timeInterval');
          }
        });
      });
    }
  }]);

  return _class;
}();

module.exports = externals.SlackBot;