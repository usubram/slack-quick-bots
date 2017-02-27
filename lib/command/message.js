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

const botLogger = require(path.join(root, 'utils/logger'));

const externals = {};
const internals = {
  channelCommandKey: ['commandPrefix', 'command', 'params'],
  directCommandKey: ['command', 'params']
};

externals.parse = function (message, isDirectMessage) {
  var parsedCommand = Object.assign({}, message);
  var channelNameRegex = new RegExp(/(?:^<\@)(?:.*)(?:(?:\>$)|(?:\>\:$))/);
  var messageArr = _.map(_.compact(message.text.split(' ')), function (item) {
    if (!_.isNaN(parseInt(item, 10))) {
      return parseInt(item, 10);
    } else if (_.isString(item) && channelNameRegex.test(item)) {
      return item;
    } else {
      return item;
    }
  });
  var keys = isDirectMessage ? internals.directCommandKey : internals.channelCommandKey;
  parsedCommand.message = internals.mapCommand(messageArr, keys);

  if (parsedCommand.message.command) {
    parsedCommand.message.command = _.camelCase(parsedCommand.message.command);
  }
  botLogger.logger.debug('message:', parsedCommand);
  return parsedCommand;
};

internals.mapCommand = function (messageArr, keys) {
  var messageMap = _.reduce(messageArr, function (result, value, key) {
    var maxLength = keys.length -1;
    if (key < maxLength) {
      result[keys[key]] = value;
    } else {
      (result[keys[maxLength]] || (result[keys[maxLength]] = [])).push(value);
    }
    return result;
  }, {});
  if (messageMap && _.isString(messageMap.commandPrefix)) {
    messageMap.commandPrefix = messageMap.commandPrefix.replace(/^<\@|\>|\:$|\>$/g, '');
  }
  return messageMap;
};

module.exports = externals;
