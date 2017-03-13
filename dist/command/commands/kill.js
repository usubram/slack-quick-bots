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

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _ = require('lodash');
var path = require('path');
var root = '..';

var botLogger = require(path.join(root, '../utils/logger'));
var Command = require(path.join(root, 'command'));
var responseHandler = require(path.join(root, '../bot/response-handler'));
var storage = require(path.join(root, '../storage/storage'));

var externals = {};

externals.Kill = function (_Command) {
  _inherits(_class, _Command);

  function _class(options) {
    var _ret;

    _classCallCheck(this, _class);

    var _this = _possibleConstructorReturn(this, (_class.__proto__ || Object.getPrototypeOf(_class)).call(this, options));

    return _ret = _this, _possibleConstructorReturn(_this, _ret);
  }

  _createClass(_class, [{
    key: 'respond',
    value: function respond(parsedMessage) {
      var killTask = this.getParams(parsedMessage, 0);

      var recursiveTaskTimer = ['eventStore', parsedMessage.channel + '_' + killTask, 'timer'];
      var alertTaskPath = ['eventStore', parsedMessage.channel + '_' + killTask];
      var scheduleTaskPath = ['eventStore', parsedMessage.channel + '_schedule_' + this.getParams(parsedMessage, 1), 'timer'];

      var recursiveTimer = _.get(this.context[killTask], recursiveTaskTimer);
      var scheduleTimer = _.get(this.context[killTask], scheduleTaskPath);
      var alertTimer = _.get(this.context[killTask], _.concat(alertTaskPath, 'timer'));

      if (recursiveTimer) {
        clearInterval(recursiveTimer);
        _.set(this, recursiveTaskTimer, undefined);

        this.messageHandler({
          channels: parsedMessage.channel,
          message: responseHandler.generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            command: killTask,
            /* jshint ignore:start */
            recursive_stop: true
          })
        });

        storage.removeEvents(this.getSlackData().self.name, 'events', {
          parsedMessage: parsedMessage,
          channels: [parsedMessage.channel],
          commandToKill: killTask
        }).catch(function (err) {
          botLogger.logger.error('Kill: Error killing recursive task', err);
        });
      } else if (alertTimer) {
        delete this.eventStore[killTask].channel[parsedMessage.channel];
        this.messageHandler({
          channels: parsedMessage.channel,
          message: responseHandler.generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            command: killTask,
            /* jshint ignore:start */
            recursive_stop: true
          })
        });

        if (_.isEmpty(this.eventStore[killTask].channel)) {
          clearInterval(this.eventStore[killTask].timer);
          this.eventStore[killTask].timer = undefined;
        }

        storage.removeEvents(this.getSlackData().self.name, 'events', {
          parsedMessage: parsedMessage,
          channels: [parsedMessage.channel],
          commandToKill: killTask
        }).catch(function (err) {
          botLogger.logger.error('Kill: Error killing alert task', err);
        });
      } else if (scheduleTimer || killTask === 'schedule') {
        if (!scheduleTimer) {
          this.messageHandler({
            channels: parsedMessage.channel,
            message: responseHandler.generateBotResponseTemplate({
              parsedMessage: parsedMessage,
              command: killTask,
              /* jshint ignore:start */
              schedule_fail: true
            })
          });
          return;
        }

        scheduleTimer.stop();
        _.set(this.context[killTask], scheduleTaskPath, undefined);

        this.messageHandler({
          channels: parsedMessage.channel,
          message: responseHandler.generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            command: killTask,
            /* jshint ignore:start */
            recursive_stop: true
          })
        });

        storage.removeEvents(this.getSlackData().self.name, 'schedule', {
          parsedMessage: parsedMessage,
          channels: [parsedMessage.channel],
          commandToKill: killTask + '_' + this.getParams(parsedMessage, 1)
        }).catch(function (err) {
          botLogger.logger.error('Kill: Error killing schedule task', err);
        });
      } else {
        this.messageHandler({
          channels: parsedMessage.channel,
          message: responseHandler.generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            command: killTask,
            /* jshint ignore:start */
            recursive_fail: true
          })
        });
      }
    }
  }, {
    key: 'process',
    value: function process(parsedMessage) {
      this.respond(parsedMessage);
      return Promise.resolve();
    }
  }]);

  return _class;
}(Command);

module.exports = externals.Kill;