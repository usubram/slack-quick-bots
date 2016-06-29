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

var url = require('url');
var assert = require('assert');
var _ = require('lodash');

var Bots = require('./bot/bots');
var connector = require('./connector');
var socket = require('./bot/socket');
var server = require('./bot/server');

var botLogger = require('./../lib/utils/logger');
var storage = require('./../lib/storage/storage');

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
  function _class(options) {
    _classCallCheck(this, _class);

    this.config = Object.assign(internals.defaultConfig.slackBotRoot, options);
    botLogger.setLogger(this.config.logger);
    storage.createEventDirectory();
    botLogger.logger.info('Index: config passed');
    this.assertInputData(this.config);
    this.bots = new Bots(this.config.bots).getBots();
    botLogger.logger.debug('Index: this.bots', this.bots);
  }

  _createClass(_class, [{
    key: 'start',
    value: function start() {
      var _this = this;

      botLogger.logger.info('Index: contacting slack for connection');

      if (this.config.server) {
        this.setupServer.call(this, this.config, function (err, server) {
          _this.server = server;
          _this.initializeBots.call(_this, server);
        });
      } else {
        this.initializeBots.call(this);
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
    value: function setupServer(config, callback) {
      var _this3 = this;

      botLogger.logger.info('Index: setting up server');
      if (config.server) {
        server.setupServer(config.server, function (request, response) {
          _this3.handleRoutes.call(_this3, request, response);
        }, function (err, server) {
          if (err) {
            botLogger.logger.info('Index: server start up failed', err);
          }
          botLogger.logger.info('Index: server started at ', server.address());
          callback(null, server);
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
      var _this5 = this;

      var paths = _.split(route.pathname, '/');
      var appRoute = _.nth(paths, 1);
      if (appRoute === 'hook' && request.method === 'POST' && !_.isEmpty(this.bots)) {
        (function () {
          var botId = _.nth(paths, 2);
          var purposeId = _.nth(paths, 3);
          _.forEach(_this5.bots, function (bot) {
            if (botId === bot.id) {
              bot.eventEmitter.emit('hookCast', purposeId, responeBody, response, _this5.respondToHook);
            }
          });
        })();
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
      var _this6 = this;

      this.bots.reduce(function (promiseItem, bot) {
        botLogger.logger.debug('Index: Creating promise for', bot);
        if (bot.config.webHook) {
          bot.server = server;
        }
        return _this6.connectToSlack(promiseItem, bot);
      }, Promise.resolve());
    }
  }, {
    key: 'closeSocketSession',
    value: function closeSocketSession(promiseItem, bot) {
      return promiseItem.then(function () {
        botLogger.logger.info('Index: closing socket connection');
        socket.closeConnection(bot);
      }).catch(function (err, reason) {
        botLogger.logger.info('Index: socket close failed', err);
        botLogger.logger.info('Index: socket close failed reason', reason);
      });
    }
  }, {
    key: 'connectToSlack',
    value: function connectToSlack(promiseItem, bot) {
      var _this7 = this;

      return promiseItem.then(function () {
        botLogger.logger.info('Index: calling startRTM');
        return _this7.startRTM(bot);
      }).then(function (slackResponse) {
        botLogger.logger.info('Index: calling create socket');
        socket.createSocket(slackResponse);
      }).catch(function (err, reason) {
        botLogger.logger.info('Index: error', err);
        botLogger.logger.info('Index: failed reason', reason);
      });
    }
  }, {
    key: 'startRTM',
    value: function startRTM(bot) {
      botLogger.logger.debug('Index: Connecting for bot %j', bot);
      return connector.connect(bot);
    }
  }, {
    key: 'assertInputData',
    value: function assertInputData(config) {
      assert.ok(config.bots, 'Invalid or empty config passed. Refer link here');
      assert.ok(config.bots.length > 0, 'Bots cannot be empty. Refer link here');
      _.forEach(config.bots, function (bot) {

        assert.ok(!_.isEmpty(bot.botToken), 'Bot need to have bot token. Refer github docs.');

        assert.ok(!_.isEmpty(bot.botCommand), 'Bot need to have atleast one command. Refer github docs.');

        assert.ok(!_.isEmpty(bot.botCommand), 'Bot need to have atleast one command. Refer github docs.');

        _.forEach(bot.botCommand, function (botCommand, key) {

          assert.ok(!_.isEmpty(botCommand.commandType), 'Each bot should have command type. Bot: ' + bot.name + ' Key: ' + key + ' Refer github docs.');

          assert.ok(_.includes(['data', 'recursive', 'kill', 'alert'], _.camelCase(botCommand.commandType)), 'Unrecognized bot command type. Only "data", "recursive", "alert", "kill" are supported');

          if (_.includes(['alert'], _.camelCase(botCommand.commandType))) {
            assert.ok(!_.isUndefined(botCommand.timeInterval), 'Bot command of type "alert" should have timeInterval');
          }
        });
      });
    }
  }]);

  return _class;
}();

module.exports = externals.SlackBot;