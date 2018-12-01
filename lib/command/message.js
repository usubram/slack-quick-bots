/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2018 Umashankar Subramanian
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
  directCommandKey: ['command', 'params'],
};

/**
* Function to parse incoming slack message.
*
* @param {array} commandList List of command name for the bot.
* @param {object} options options for parse.
* @param {string} options.id bot id.
* @param {string} options.name bot name.

* @return {object} parsed bot message.
*/
externals.parse = _.curry(function (commandList, options, message) {
  const parsedCommand = Object.assign({}, message);
  const messageArr = _.compact(_.get(message, 'text', '').split(' '));

  parsedCommand.message = internals
    .mapCommand(commandList, messageArr, options);

  logger.debug('Received message: ', parsedCommand);

  return parsedCommand;
});

/**
* Function to map params against message type.
*
* @param {array} commandList List of command name for the bot.
* @param {array} messageArr message split into array.
* @param {object} options options for parse.
* @param {string} options.id bot id.
* @param {string} options.name bot name.

* @return {object} mapped bot message.
*/
internals.mapCommand = function (commandList, messageArr, options) {
  const firstArg = messageArr[0];
  const secondArg = messageArr[1];
  const upperCaseFirstArg = _.toUpper(firstArg);
  const upperCaseSecondArg = _.toUpper(secondArg);
  const botMentionNameRegex = new RegExp(/^<@(.*?)>:?$/);
  const botNameRegex = new RegExp(/^@(.*?)?$/);
  const botId = _.nth(botMentionNameRegex.exec(firstArg), 1);
  const botName = _.toUpper(_.nth(botNameRegex.exec(firstArg), 1) ||
    upperCaseFirstArg);
  const messageMap = {};

  if (options.id === botId || _.toUpper(options.name) === botName) {
    messageMap.commandPrefix = botId || botName;
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
  return _.map(_.slice(messageArr, position, messageArr.length),
    function (item) {
      return item;
    });
};

module.exports = externals;
