/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const _ = require('lodash');
const path = require('path');
const root = '..';

const logger = require(path.join(root, 'utils/logger'));

const externals = {};
const internals = {
  channelCommandKey: ['commandPrefix', 'command', 'params'],
  directCommandKey: ['command', 'params']
};

externals.parse = _.curry(function (commandList, options, message) {
  var parsedCommand = Object.assign({}, message);
  var messageArr = _.compact(_.get(message,'text', '').split(' '));

  parsedCommand.message = internals.mapCommand(commandList, messageArr, options);

  logger.debug('Received message: ', parsedCommand);

  return parsedCommand;
});

internals.mapCommand = function (commandList, messageArr, options) {
  const firstArg = messageArr[0];
  const secondArg = messageArr[1];
  const upperCaseFirstArg = _.toUpper(firstArg);
  const upperCaseSecondArg = _.toUpper(secondArg);
  const botMentionNameRegex = new RegExp(/^<\@(.*?)>\:?$/);
  const botId = _.nth(botMentionNameRegex.exec(firstArg), 1);
  const botName = _.toUpper(options.name);
  let messageMap = {};

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
  return _.map(_.slice(messageArr, position, messageArr.length), function(item) {
    let paramNumber = Number(item);
    if (paramNumber) {
      return paramNumber;
    }

    return item;
  });
};

module.exports = externals;
