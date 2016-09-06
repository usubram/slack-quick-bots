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
var CronJob = require('cron').CronJob;

var root = '..';

var botLogger = require(path.join(root, '../utils/logger'));
var Command = require(path.join(root, 'command'));
var responseHandler = require(path.join(root, '../bot/response-handler'));
var storage = require(path.join(root, '../storage/storage'));

var externals = {};
var internals = {};

externals.Schedule = function (_Command) {
  _inherits(_class, _Command);

  function _class(options) {
    var _ret;

    _classCallCheck(this, _class);

    var _this = _possibleConstructorReturn(this, (_class.__proto__ || Object.getPrototypeOf(_class)).call(this, options));

    return _ret = _this, _possibleConstructorReturn(_this, _ret);
  }

  _createClass(_class, [{
    key: 'preprocess',
    value: function preprocess(parsedMessage) {
      var _this2 = this;

      return Promise.resolve({
        then: function then(onFulfill, onReject) {
          try {

            var job = new CronJob({
              cronTime: internals.getCronExpresion(parsedMessage),
              onTick: function onTick() {
                var scheduleCommand = internals.getCommandArguments(parsedMessage);
                var command = _this2.context[_.get(scheduleCommand, 'message.command')];
                command.quietRespond(scheduleCommand);
              },
              start: false,
              timeZone: 'America/Los_Angeles'
            });

            job.start();

            _this2.setTimer(parsedMessage, job);
          } catch (err) {
            onReject(err);
          }

          onFulfill(parsedMessage);
        }
      }).then(function () {
        return storage.updateEvents(_this2.getSlackData().self.name, 'schedule', {
          parsedMessage: parsedMessage,
          channels: [parsedMessage.channel]
        });
      });
    }
  }, {
    key: 'process',
    value: function process(parsedMessage) {
      var _this3 = this;

      return Promise.resolve({
        then: function then(onFulfill, onReject) {
          var scheduleCommand = internals.getCommandArguments(parsedMessage);
          _this3.callback = function (data) {
            onFulfill(_this3.message.bind(_this3, scheduleCommand)(data));
          };

          try {
            _this3.getCommand(_.get(scheduleCommand, 'message.command')).data.apply(_this3, [{
              command: scheduleCommand.message.command, params: scheduleCommand.message.params
            }, _this3.buildOptions(scheduleCommand, _this3.getSlackData(), _this3.purpose), _this3.callback]);
          } catch (err) {
            botLogger.logger.error('Command: error calling handler,' + 'make sure to pass a proper function', err, err.stack);
            return onReject(err);
          }
        }
      });
    }
  }, {
    key: 'notify',
    value: function notify(parsedMessage) {
      var _this4 = this;

      return Promise.resolve({
        then: function then(onFulfill) {
          _this4.messageHandler({
            channels: parsedMessage.channel,
            message: responseHandler.generateBotResponseTemplate({
              parsedMessage: parsedMessage,
              /* jshint ignore:start */
              schedule_success: true
              /* jshint ignore:end */
            })
          });
          onFulfill();
        }
      });
    }
  }, {
    key: 'message',
    value: function message(parsedMessage, data) {
      var command = this.getCommand(_.get(parsedMessage, 'message.command'));
      if (data && command.responseType || _.get(data, 'type')) {
        responseHandler.processFile({
          channels: [parsedMessage.channel],
          message: {
            data: data,
            commandName: _.get(parsedMessage, 'message.command'),
            config: command.responseType
          }
        }, this.getBotConfig().botToken);
      } else if (data && _.isFunction(command.template)) {
        try {
          this.messageHandler({
            channels: [parsedMessage.channel],
            message: command.template()(data)
          });
        } catch (err) {
          botLogger.logger.error('Command: make sure to pass a' + 'compiled handlebar template', err, err.stack);
        }
      }
    }
  }, {
    key: 'validate',
    value: function validate(parsedMessage) {
      var _this5 = this;

      var scheduleCommand = internals.getCommandArguments(parsedMessage);
      var command = this.context[_.get(scheduleCommand, 'message.command')];

      if (!command) {
        return Promise.reject({ invalidCommand: true, parsedMessage: parsedMessage });
      }

      return Promise.resolve(this.isCommandValid(scheduleCommand, command)).then(function () {
        return _this5.isCronValid(internals.getCronExpresion(parsedMessage), parsedMessage);
      });
    }
  }, {
    key: 'isCommandValid',
    value: function isCommandValid(scheduleCommand, command) {
      return Promise.resolve(command.validate(scheduleCommand));
    }
  }, {
    key: 'isCronValid',
    value: function isCronValid(cron, parsedMessage) {
      return Promise.resolve({
        then: function then(onFulfill, onReject) {
          try {
            if (_.isEmpty(cron) || cron.length > 9 && cron.indexOf('* * * * *') > -1) {
              onReject({ invalidCron: true, parsedMessage: parsedMessage });
            }

            var testCron = new CronJob(cron, function () {});
            testCron.stop();
            onFulfill();
          } catch (err) {
            onReject({ invalidCron: true, parsedMessage: parsedMessage });
          }
        }
      });
    }
  }, {
    key: 'setTimer',
    value: function setTimer(parsedMessage, job) {
      var scheduleCommand = internals.getCommandArguments(parsedMessage);
      if (this.getTimer(parsedMessage)) {
        this.getTimer(parsedMessage).stop();
      }
      _.set(this.eventStore, scheduleCommand.channel + '_schedule_' + _.get(scheduleCommand, 'message.command') + '.timer', job);
    }
  }, {
    key: 'getTimer',
    value: function getTimer(parsedMessage) {
      var scheduleCommand = internals.getCommandArguments(parsedMessage);
      return _.get(this.eventStore, scheduleCommand.channel + '_schedule_' + _.get(scheduleCommand, 'message.command') + '.timer');
    }
  }]);

  return _class;
}(Command);

internals.getCronExpresion = function (parsedMessage) {
  var cronRegex = /\((.*?)\)/;
  var cronExpresion = cronRegex.exec(_.join(parsedMessage.message.params, ' '));
  return _.trim(_.nth(cronExpresion, 1));
};

internals.getCommandArguments = function (parsedMessage) {
  var result = [];
  _.forEach(_.slice(_.get(parsedMessage, 'message.params'), 1, _.get(parsedMessage, 'message.params', []).length), function (value) {
    if (_.isString(value) && value.indexOf('(') > -1) {
      return false;
    }
    result.push(value);
  });
  return {
    type: 'message',
    channel: parsedMessage.channel,
    message: {
      command: _.nth(parsedMessage.message.params),
      params: result
    }
  };
};

module.exports = externals.Schedule;