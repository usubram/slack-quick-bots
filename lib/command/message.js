'use strict';

var _ = require('lodash');

const internals = {
  channelCommandKey: ['commandPrefix', 'command', 'params'],
  directCommandKey: ['command', 'params']
};

exports.parse = function (message, isDirectMessage) {
  var parsedCommand = Object.assign({}, message);
  var channelNameRegex = new RegExp(/(?:^<\@)(?:.*)(?:(?:\>$)|(?:\>\:$))/);
  var messageArr = _.map(_.compact(message.text.split(' ')), function (item) {
    if (!_.isNaN(parseInt(item, 10))) {
      return parseInt(item, 10);
    } else if (_.isString(item) && channelNameRegex.test(item)) {
      return item;
    } else if (_.isString(item)) {
      return _.camelCase(item);
    } else {
      return item;
    }
  });
  var keys = isDirectMessage ? internals.directCommandKey : internals.channelCommandKey;
  parsedCommand.message = this._mapCommand(messageArr, keys);
  return parsedCommand;
};

exports._mapCommand = function (messageArr, keys) {
  var messageMap = _.reduce(messageArr, function (result, value, key) {
    var maxLength = keys.length -1;
    if (key < maxLength) {
      result[keys[key]] = value;
    } else {
      (result[keys[maxLength]] || (result[keys[maxLength]] = [])).push(value);
    }
    return result;
  }, {});
  if (messageMap && messageMap.commandPrefix) {
    messageMap.commandPrefix = messageMap.commandPrefix.replace(/^<\@|\>|\:$|\>$/g, '');
  }
  return messageMap;
};
