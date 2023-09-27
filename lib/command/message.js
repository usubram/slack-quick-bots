'use strict';

import * as lodash from 'lodash-es';
import logger from '../utils/logger.js';

const { curry, compact, get, trim, toUpper, nth, forEach, map, slice } = lodash;
/**
* Function to parse incoming slack message.
*
* @param {array} commandList List of command name for the bot.
* @param {object} options options for parse.
* @param {string} options.id bot id.
* @param {string} options.name bot name.

* @return {object} parsed bot message.
*/
const parse = curry(function (commandList, options, message) {
  const parsedCommand = Object.assign({}, message);
  const messageArr = compact(
    get(message, 'text', '')
      /* eslint-disable no-control-regex */
      .replace(/[^\x00-\x7F]/g, ' ')
      .replace(/^<@(.*?)>/, (str) => `${str} `)
      .split(' ')
  );

  parsedCommand.message = mapCommand(commandList, messageArr, options);

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
const mapCommand = function (commandList, messageArr, options) {
  const firstArg = messageArr[0];
  const secondArg = messageArr[1];
  const upperCaseFirstArg = trim(toUpper(firstArg));
  const upperCaseSecondArg = trim(toUpper(secondArg));
  const botMentionNameRegex = new RegExp(/^<@(.*?)>/);
  const botNameRegex = new RegExp(/^@(.*?)?$/);
  const botId = nth(botMentionNameRegex.exec(firstArg), 1);
  const botName = toUpper(
    nth(botNameRegex.exec(firstArg), 1) || upperCaseFirstArg
  );
  const messageMap = {};
  const isEid = options.eId ? options.eId === botId : false;

  if (options.id === botId || isEid || toUpper(options.name) === botName) {
    messageMap.commandPrefix = botId || botName;
  }

  forEach(commandList, function (command) {
    if (messageMap.commandPrefix) {
      if (
        trim(command.command) === upperCaseSecondArg ||
        command.alias.indexOf(upperCaseSecondArg) > -1
      ) {
        messageMap.command = command.command;
        messageMap.params = mapParams(messageArr, 2);
      }
    } else if (
      command.command === upperCaseFirstArg ||
      command.alias.indexOf(upperCaseFirstArg) > -1
    ) {
      messageMap.command = command.command;
      messageMap.params = mapParams(messageArr, 1);
    }
  });

  return messageMap;
};

const mapParams = function (messageArr, position) {
  return map(slice(messageArr, position, messageArr.length), function (item) {
    return item;
  });
};

export { parse };
