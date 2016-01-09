'use strict';

var _ = require('lodash');

const internals = {
  commandKey: ['commandPrefix', 'command', 'params']
};

exports.parse = function(message, isDirectMessage) {
  var parsedCommand = Object.assign({}, message);
  var messageArr = _.map(_.compact(message.text.split(' ')), function(item) {
    return _.isString(item) ? _.camelCase(item) : item;
  });
  var parsedMessage = _.zipObject(internals.commandKey, _.take(messageArr, 2));
  if (messageArr.length > 1) {
    var param = _.takeRight(messageArr, messageArr.length - 2).join(' ');
    if (param && !_.isNaN(parseInt(param, 10))) {
      param = parseInt(param, 10);
    }
    parsedMessage.params = param;
  }
  if (isDirectMessage) {
    var shortDirectMessage = parsedMessage.command ? parsedMessage.command : '';
    shortDirectMessage += parsedMessage.params ? ' ' + parsedMessage.params : '';
    parsedMessage.params = _.trim(shortDirectMessage);
    parsedMessage.command = parsedMessage.commandPrefix;
  }
  parsedCommand.message = parsedMessage;
  return parsedCommand;
};
