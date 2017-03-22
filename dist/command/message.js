/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

var _ = require('lodash');
var path = require('path');
var root = '..';

var botLogger = require(path.join(root, 'utils/logger'));

var externals = {};
var internals = {
  channelCommandKey: ['commandPrefix', 'command', 'params'],
  directCommandKey: ['command', 'params']
};

externals.parse = _.curry(function (commandList, options, message) {
  var parsedCommand = Object.assign({}, message);
  var messageArr = _.compact(_.get(message, 'text', '').split(' '));

  parsedCommand.message = internals.mapCommand(commandList, messageArr, options);

  botLogger.logger.debug('message:', parsedCommand);

  return parsedCommand;
});

internals.mapCommand = function (commandList, messageArr, options) {
  var firstArg = messageArr[0];
  var secondArg = messageArr[1];
  var upperCaseFirstArg = _.toUpper(firstArg);
  var upperCaseSecondArg = _.toUpper(secondArg);
  var botMentionNameRegex = new RegExp(/^<\@(.*?)>\:?$/);
  var botId = _.nth(botMentionNameRegex.exec(firstArg), 1);
  var botName = _.toUpper(options.name);
  var messageMap = {};

  if (options.id === botId || botName === upperCaseFirstArg) {
    messageMap.commandPrefix = botId || upperCaseFirstArg;
  }

  _.forEach(commandList, function (command) {
    if (messageMap.commandPrefix) {
      if (command === upperCaseSecondArg) {
        messageMap.command = upperCaseSecondArg;
        messageMap.params = internals.mapParams(messageArr, 2);
      }
    } else if (command === upperCaseFirstArg) {
      messageMap.command = upperCaseFirstArg;
      messageMap.params = internals.mapParams(messageArr, 1);
    }
  });

  return messageMap;
};

internals.mapParams = function (messageArr, position) {
  return _.map(_.slice(messageArr, position, messageArr.length), function (item) {
    var paramNumber = Number(item);
    if (paramNumber) {
      return paramNumber;
    }

    return item;
  });
};

module.exports = externals;