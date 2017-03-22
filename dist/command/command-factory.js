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

var Data = require(path.join(root, 'command/commands/data'));
var Recursive = require(path.join(root, 'command/commands/recursive'));
var Alert = require(path.join(root, 'command/commands/alert'));
var Kill = require(path.join(root, 'command/commands/kill'));
var Schedule = require(path.join(root, 'command/commands/schedule'));

var externals = {};

externals.CommandFactory = function () {
  function _class(options) {
    _classCallCheck(this, _class);

    this.options = options;
    this.commandObj = {};

    return this;
  }

  _createClass(_class, [{
    key: 'loadCommands',
    value: function loadCommands() {
      var _this = this;

      _.forEach(this.options.getBotConfig().botCommand, function (command, key) {
        _this.commandObj[key] = _this.getCommand({
          context: _this.commandObj,
          commandName: key,
          getBotConfig: _this.options.getBotConfig,
          getSlackData: _this.options.getSlackData,
          getHook: _this.options.getHook,
          getEventStore: _this.options.getEventStore,
          messageHandler: _this.options.messageHandler
        }, command.commandType);
      });
    }
  }, {
    key: 'getCommand',
    value: function getCommand(options, commandType) {
      var command = void 0;
      switch (commandType) {
        case 'ALERT':
          command = new Alert(options);
          break;
        case 'DATA':
          command = new Data(options);
          break;
        case 'KILL':
          command = new Kill(options);
          break;
        case 'RECURSIVE':
          command = new Recursive(options);
          break;
        case 'SCHEDULE':
          command = new Schedule(options);
          break;
      }
      return command;
    }
  }, {
    key: 'handleMessage',
    value: function handleMessage(parsedMessage) {
      var _this2 = this;

      return Promise.resolve({
        then: function then(onFulfill, onReject) {
          var command = _this2.commandObj[_.get(parsedMessage, 'message.command')];
          if (command) {
            command.validate(parsedMessage).then(function () {
              return command.typingMessage(parsedMessage);
            }).then(function () {
              return command.respond(parsedMessage);
            }).then(function (response) {
              onFulfill(response);
            }).catch(function (err) {
              onReject(err);
            });
          } else {
            onReject({ error: true, parsedMessage: parsedMessage });
          }
        }
      });
    }
  }, {
    key: 'handleHook',
    value: function handleHook(purposeId, requestData) {
      var _this3 = this;

      return Promise.resolve({
        then: function then(onFulfill, onReject) {
          var hookInstance = _.head(_.compact(_.map(_this3.commandObj, ['hookContext', purposeId, 'command'].join('.'))));
          var commandModel = _.get(_this3.commandObj, hookInstance, undefined);
          if (requestData && hookInstance && commandModel) {
            var template = _.get(commandModel, 'command.template', _.noop);
            var renderedData = requestData.text || template(requestData);
            onFulfill({
              channels: [commandModel.hookContext[purposeId].channel],
              message: renderedData
            });
          } else {
            onReject({ error: 'invalid hook url' });
          }
        }
      });
    }
  }]);

  return _class;
}();

module.exports = externals.CommandFactory;