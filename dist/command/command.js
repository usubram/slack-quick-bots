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
var path = require('path');
var root = '..';

var botLogger = require(path.join(root, 'utils/logger'));

var externals = {};
var internals = {};

externals.Commands = function () {
  function _class(options) {
    _classCallCheck(this, _class);

    this.context = options.context;
    this.getBotConfig = options.getBotConfig;
    this.getSlackData = options.getSlackData;
    this.getHook = options.getHook;
    this.commandName = options.commandName;
    this.getEventStore = options.getEventStore;
    this.messageHandler = options.messageHandler;
    this.template = this.getTemplate();
    this.eventStore = {};

    this.loadEvents();
    return this;
  }

  _createClass(_class, [{
    key: 'validate',
    value: function validate(slackResponse) {
      var _this = this;

      return Promise.resolve({
        then: function then(onFulfill, onReject) {
          if (!internals.isCommandAllowed(_this.getCommand(), slackResponse, _this.getSlackData().users)) {
            /* jshint ignore:start */
            return onReject({
              restricted_user: true,
              users: _this.getCommand().allowedUsers,
              parsedMessage: slackResponse
            });
            /* jshint ignore:end */
          } else if (_this.setDefaultParams(_this.getCommand(), slackResponse, 0)) {
            return onFulfill();
          }

          var isLimitValid = internals.isLimitValid(_this.getCommand(), slackResponse);
          var isAllowedParamValid = internals.isAllowedParamValid(_this.getCommand(), slackResponse);

          if (isLimitValid || isAllowedParamValid) {
            return onFulfill();
          } else if (!isLimitValid || !isAllowedParamValid) {
            if (!isLimitValid && _this.getCommand().lowerLimit || _this.getCommand().upperLimit) {
              return onReject({ limit: true, parsedMessage: slackResponse });
            }
            if (!isAllowedParamValid) {
              return onReject({ param: true, parsedMessage: slackResponse });
            }
          } else if (!internals.isAlertValid(_this.getCommand(), slackResponse)) {
            onReject({ alert: true, parsedMessage: slackResponse });
          } else {
            onFulfill();
          }
        }
      });
    }
  }, {
    key: 'respond',
    value: function respond(parsedMessage) {
      var _this2 = this;

      return this.preprocess(parsedMessage).then(function () {
        return _this2.notify(parsedMessage);
      }).then(function () {
        return _this2.process(parsedMessage);
      }).catch(function (err) {
        botLogger.logger.info('Error processing command ', err);
      });
    }
  }, {
    key: 'notify',
    value: function notify(response) {
      return Promise.resolve(response);
    }
  }, {
    key: 'message',
    value: function message() {
      // Nothing to execute
    }
  }, {
    key: 'loadEvents',
    value: function loadEvents() {
      var _this3 = this;

      var savedEvents = _.values(this.getEventStore());
      if (savedEvents) {
        savedEvents.reduce(function (evPromise, savedEvent) {
          if (_.get(savedEvent, 'parsedMessage.message.command') === _this3.getCommandName()) {
            _this3.reloadCommand(savedEvent.parsedMessage);
          }
        }, Promise.resolve());
      }
    }
  }, {
    key: 'reloadCommand',
    value: function reloadCommand(parsedMessage) {
      this.preprocess(parsedMessage).then(this.process(parsedMessage)).then(function (parsedMessage) {
        return Promise.resolve(parsedMessage);
      }).catch(function (err) {
        botLogger.logger.info('Error processing command ', err);
      });
    }
  }, {
    key: 'quietRespond',
    value: function quietRespond(parsedMessage) {
      this.process(parsedMessage).catch(function (err) {
        botLogger.logger.info('Error processing command ', err);
      });
    }
  }, {
    key: 'typingMessage',
    value: function typingMessage(parsedMessage) {
      this.messageHandler({
        channels: parsedMessage.channel,
        message: '',
        type: 'typing'
      });
    }
  }, {
    key: 'buildOptions',
    value: function buildOptions(slackResponse, slackData, purpose) {
      return {
        channel: slackResponse.channel,
        hookUrl: _.get(purpose, 'url', undefined),
        user: _.find(slackData.users, { 'id': slackResponse.user })
      };
    }
  }, {
    key: 'setDefaultParams',
    value: function setDefaultParams(command, slackResponse, level) {
      var param = internals.getParams(slackResponse, level);
      if (!param && param !== 0 && command.defaultParamValue) {
        slackResponse.message.params = slackResponse.message.params || [];
        slackResponse.message.params[level] = command.defaultParamValue;
        return true;
      }
      return false;
    }
  }, {
    key: 'getHookContext',
    value: function getHookContext(purpose, channel, command) {
      var hookContext = {};
      if (purpose && purpose.id) {
        hookContext[purpose.id] = {};
        hookContext[purpose.id].channel = channel;
        hookContext[purpose.id].command = command;
      }
      return hookContext;
    }
  }, {
    key: 'getParams',
    value: function getParams(slackResponse, level) {
      return internals.getParams(slackResponse, level);
    }
  }, {
    key: 'getCommand',
    value: function getCommand(commandName) {
      return this.getBotConfig().botCommand[this.getCommandName(commandName)];
    }
  }, {
    key: 'getCommandName',
    value: function getCommandName(commandName) {
      return _.toUpper(commandName || this.commandName);
    }
  }, {
    key: 'getTemplate',
    value: function getTemplate() {
      var template = this.getBotConfig().botCommand[this.getCommandName()].template;
      try {
        template = template ? template() : undefined;
      } catch (err) {
        botLogger.logger.error('Command: make sure to pass a compiled handlebar template', err);
      }
      return template;
    }
  }, {
    key: 'getTimer',
    value: function getTimer(parsedMessage) {
      return _.get(this.eventStore, parsedMessage.channel + '_' + this.getCommandName() + '.timer');
    }
  }, {
    key: 'setTimer',
    value: function setTimer(parsedMessage, callback) {
      if (this.getTimer(parsedMessage)) {
        clearInterval(this.getTimer(parsedMessage));
      }

      _.set(this.eventStore, parsedMessage.channel + '_' + this.getCommandName() + '.timer', callback);
    }
  }]);

  return _class;
}();

internals.getParams = function (slackResponse, level) {
  if (_.get(slackResponse, 'message.params', []).length) {
    if (!_.isNaN(parseInt(slackResponse.message.params[level], 10))) {
      return parseInt(slackResponse.message.params[level], 10);
    }

    return _.get(slackResponse, 'message.params[' + level + ']');
  }
};

internals.isAllowedParamValid = function (command, slackResponse) {
  if (_.isEmpty(command.allowedParam)) {
    return false;
  }

  var param = internals.getParams(slackResponse, 0);
  param = Number(param) ? Number(param) : _.toUpper(param);

  if (_.nth(command.allowedParam, 0) === '*' || _.includes(command.allowedParam, param)) {
    return true;
  }
  // assuming that limit is not defined.
  return false;
};

internals.isLimitValid = function (command, slackResponse) {
  if (!command.lowerLimit && !command.upperLimit) {
    return false;
  }

  var responseParam = internals.getParams(slackResponse, 0);
  if (responseParam >= 0) {
    var lowerLimit = parseInt(command.lowerLimit, 10) || 0;
    var upperLimit = parseInt(command.upperLimit, 10) || 0;
    if (_.isNaN(responseParam) || responseParam < lowerLimit || responseParam > upperLimit) {
      return false;
    }
    return true;
  }
  // assuming that limit is not defined.
  return false;
};

internals.isCommandAllowed = function (command, slackResponse, users) {
  if (command && command.allowedUsers) {
    var currentUser = _.find(users, { 'id': slackResponse.user });
    if (currentUser) {
      return _.includes(command.allowedUsers, currentUser.id) || _.includes(command.allowedUsers, currentUser.name);
    }
    return true;
  }
  return true;
};

module.exports = externals.Commands;