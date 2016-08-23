var _ = require('lodash');

var getCronExpresion = function (parsedMessage) {
  var cronExpresion;
  var cronRegex = /\((.*?)\)/;
  cronExpresion = cronRegex.exec(_.join(parsedMessage.params, ' '));
  return _.trim(_.nth(cronExpresion, 1));
};

var tem = getCronExpresion({params: ['log', '1', '(', '*/2', 0, 2, 5, 6, ')']});
console.log(tem);
tem = getCronExpresion({params: []});
if (_.isEmpty(tem)) {
  console.log('nothing');
}
console.log(tem);

var getExp = function (parsedMessage) {
  let result = [];
  _.forEach(_.slice(parsedMessage.message.params, 1, parsedMessage.message.params.length), function (value) {
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
var va1 = getExp({
  type: 'message',
  channel: 'CHANNEL',
  message: {
    command: 'schedule',
    params: ['log', 100, '(', 'root']
  }
});
console.log('va1', va1);
