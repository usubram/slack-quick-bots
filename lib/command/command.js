/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const _ = require('lodash');
const botLogger = require('./../../lib/utils/logger');

const internals = {
  commandTypes: ['data', 'recursive', 'kill', 'alert'],
  alertParams: ['setup', 'sample']
};
const externals = {};

exports = module.exports = externals.Command = function (commands) {
  this.commands = commands;
  return this;
};

externals.Command.prototype.respondToCommand = function (slackResponse) {

  var commandModel = this.commands[slackResponse.message.command];

  if(commandModel) {
    switch (commandModel.commandType) {
      case internals.commandTypes[0]:
        internals.getData.call(this, slackResponse);
        break;
      case internals.commandTypes[1]:
        internals.setUpRecursiveTask.call(this, commandModel, slackResponse);
        break;
      case internals.commandTypes[2]:
        internals.killTask.call(this, commandModel, slackResponse);
        break;
      case internals.commandTypes[3]:
        internals.handleAlertTask.call(this, commandModel, slackResponse);
        break;
    }
  }
};

externals.Command.prototype.loadCommand = function (slackResponse) {
  return new Promise((resolve) => {
    var commandModel = this.commands[slackResponse.message.command];
    if(commandModel) {
      switch (commandModel.commandType) {
        case internals.commandTypes[1]:
          internals.setUpRecursiveTask.call(this, commandModel, slackResponse);
          resolve('done');
          break;
        case internals.commandTypes[3]:
          internals.handleAlertTask.call(this, commandModel, slackResponse);
          resolve('done');
          break;
      }
    }
  });
};

externals.Command.prototype.validateCommand = function (slackResponse, cb) {
  var commandModel = this.commands[slackResponse.message.command];

  if (!commandModel) {
    return cb({ error: true, parsedMessage: slackResponse });
  } else if (!internals.isCommandAllowed(commandModel, slackResponse, this.slackData.users)) {
    /* jshint ignore:start */
    return cb({ restricted_user: true,
      users: commandModel.allowedUsers, parsedMessage: slackResponse });
    /* jshint ignore:end */
  } else if (internals.setDefaultParams(commandModel, slackResponse, 0)) {
    return cb();
  }

  var isLimitValid = internals.isLimitValid(commandModel, slackResponse);
  var isAllowedParamValid = internals.isAllowedParamValid(commandModel, slackResponse);

  if (isLimitValid || isAllowedParamValid) {
    cb();
  } else if (!isLimitValid || !isAllowedParamValid) {
    if (!isLimitValid && commandModel.lowerLimit || commandModel.upperLimit) {
      return cb({ limit: true, parsedMessage: slackResponse });
    }
    if (!isAllowedParamValid) {
      return cb({ param: true, parsedMessage: slackResponse });
    }
  } else if (!internals.isAlertValid(commandModel, slackResponse)) {
    cb({ alert: true, parsedMessage: slackResponse });
  } else {
    cb();
  }
};

externals.Command.prototype.getCommands = function () {
  return this.commands;
};

externals.Command.prototype.sendResponseToHook =
  function (purposeId, requestData, response, callback) {
  if (this.hookContext &&
    this.hookContext[purposeId] &&
    this.hookContext[purposeId].command &&
    this.commands[this.hookContext[purposeId].command]) {
    var commandModel = this.commands[this.hookContext[purposeId].command];
    var template = commandModel.template ? commandModel.template() : '';
    if (requestData) {
      var renderedData = requestData.text ? requestData.text : template(requestData);
      this.eventEmitter.emit('command:hook:respond', {
        channels: [this.hookContext[purposeId].channel],
        data: {
          hook: renderedData
        }
      });
      callback(null, response);
    } else {
      callback({error: 'invalid hook url'}, response);
    }
  }
};

internals.getData = function (slackResponse) {
  var commandModel = this.commands[slackResponse.message.command];
  var purpose = this.hook ? this.hook.getHookPurpose(slackResponse.channel) : '';
  if (purpose && purpose.id) {
    this.hookContext = {};
    this.hookContext[purpose.id] = {};
    this.hookContext[purpose.id].channel = slackResponse.channel;
    this.hookContext[purpose.id].command = slackResponse.message.command;
  }
  var template = '';

  internals.setDefaultParams(commandModel, slackResponse, 0);

  try {
    template = commandModel.template ? commandModel.template() : '';
  } catch (err) {
    botLogger.logger.error('Command: make sure to pass a compiled handlebar template', err);
  }

  var callbackHelper = (data) => {
    if (data && commandModel.responseType) {
      this.eventEmitter.emit('command:data:graph', {
        channels: [slackResponse.channel],
        message: {
          data: data,
          commandName: slackResponse.message.command,
          config: commandModel.responseType
        }
      });
    } else if (data && _.isFunction(template)) {
      try {
        this.eventEmitter.emit('command:data:respond', {
          channels: [slackResponse.channel],
          message: {
            data: template(data)
          }
        });
      } catch (err) {
        botLogger.logger.error('Command: make sure to pass a' +
          'compiled handlebar template', err, err.stack);
      }
    }
  };

  try {
    commandModel.data.apply(this, [{
        command: slackResponse.message.command, params: slackResponse.message.params
      },
      internals.buildOptions(slackResponse, this.slackData, purpose),
      callbackHelper]);
  } catch (err) {
    botLogger.logger.error('Command: error calling handler,' +
      'make sure to pass a proper function', err, err.stack);
  }
};

internals.getDataForAlert = function (slackResponse) {
  var context = this;
  var commandModel = this.commands[slackResponse.message.command];
  var callbackHelper = function (data) {
    var channelsToAlert = [];
    if (data && data.length > 0) {
      var varianceResult = internals.calculateVariance(data);
      context.dataSample = context.dataSample || {};
      context.dataSample.value = context.dataSample.value || [];
      context.dataSample.time = new Date().toString();

      if (varianceResult && varianceResult.perct) {
        if (context.dataSample.value.length >= 5) {
          context.dataSample.value.pop();
        }
        context.dataSample.value.unshift(varianceResult.perct);
        channelsToAlert = _.flatten(_.compact(_.map(commandModel.alertTask.channel,
          function (value, key) {
            if (varianceResult.perct > commandModel.alertTask.channel[key].sentivity) {
              return key;
            }
          })
        ));
      }
      if (channelsToAlert && channelsToAlert.length > 0) {
        context.eventEmitter.emit('command:alert:respond', {
          template: commandModel.template,
          channels: channelsToAlert,
          message: {
            alert: true,
            dataset: data,
            perct: varianceResult.perct,
            time: new Date().toString()
          }
        });
      }
    }
  };
  try {
    commandModel.data.apply(null,
      [slackResponse.message.command, slackResponse.message.params, callbackHelper]);
  } catch (err) {
    botLogger.logger.error('Command: error calling handler,' +
      ' make sure to pass a proper function', err, err.stack);
  }
};

internals.setUpRecursiveTask = function (commandModel, slackResponse) {
  var timer = internals.getParams(slackResponse, 0);
  timer = _.isNumber(timer) ? timer : 1;
  if (commandModel.timeUnit === 'h') {
    timer = timer * 3600000;
  } else {
    timer = timer * 60000; // default to minute
  }
  if (commandModel.recursiveTasks && commandModel.recursiveTasks[slackResponse.channel]) {
    clearInterval(commandModel.recursiveTasks[slackResponse.channel].timer);
  }
  commandModel.recursiveTasks = commandModel.recursiveTasks ? commandModel.recursiveTasks : {};
  commandModel.recursiveTasks[slackResponse.channel] = {};
  commandModel.recursiveTasks[slackResponse.channel].channel = slackResponse.channel;
  commandModel.recursiveTasks[slackResponse.channel].timer = setInterval(() => {
    internals.getData.call(this, slackResponse);
  }, timer);

  this.eventEmitter.emit('command:setup:recursive',
    {
      parsedMessage: slackResponse,
      channels: [slackResponse.channel],
      message: {
        /* jshint ignore:start */
        recursive_success: true,
        /* jshint ignore:end */
      }
    }
  );
  internals.getData.call(this, slackResponse);
};

internals.handleAlertTask = function (commandModel, slackResponse) {
  if (internals.getParams(slackResponse, 0) === internals.alertParams[1]) {

    this.eventEmitter.emit('command:alert:sample', {
        template: commandModel.template,
        channels: [slackResponse.channel],
        message: {
          sample: true,
          dataset: this.dataSample ? this.dataSample.value : '',
          time: this.dataSample ? this.dataSample.time : ''
        }
      }
    );

  } else if (internals.getParams(slackResponse, 0) === internals.alertParams[0]) {
    internals.setUpAlertTask.call(this, commandModel, slackResponse);

    this.eventEmitter.emit('command:setup:alert',
      {
        parsedMessage: slackResponse,
        channels: [slackResponse.channel],
        message: {
          /* jshint ignore:start */
          alert_notification: true,
          /* jshint ignore:end */
          threshold: internals.getParams(slackResponse, 1) || 75,
        }
      }
    );

    internals.getDataForAlert.call(this, slackResponse);
  }
};

internals.setUpAlertTask = function (commandModel, slackResponse) {
  var sentivity = internals.getParams(slackResponse, 1) || 75;
  var timer = commandModel.timeInterval;
  if (commandModel.timeUnit === 'h') {
    timer = timer * 3600000;
  } else {
    timer = timer * 60000; // default to minute
  }

  commandModel.alertTask = commandModel.alertTask ? commandModel.alertTask : {};
  commandModel.alertTask.channel = commandModel.alertTask.channel ?
    commandModel.alertTask.channel : {};
  commandModel.alertTask.channel[slackResponse.channel] =
    commandModel.alertTask.channel[slackResponse.channel] || {};

  _.remove(commandModel.alertTask.channel[slackResponse.channel], (channel) => {
    if (channel && slackResponse.channel === channel) {
      return true;
    }
    return false;
  });

  commandModel.alertTask.channel[slackResponse.channel].sentivity = sentivity;

  if (!commandModel.alertTask.timer) {
    commandModel.alertTask.timer = setInterval(() => {
      internals.getDataForAlert.call(this, slackResponse);
    }, timer);
  }
};

internals.killTask = function (commandModel, slackResponse) {
  var killTask = commandModel.parentTask || internals.getParams(slackResponse, 0);
  var parentTask = this.commands[killTask];
  if (parentTask && parentTask.recursiveTasks &&
      parentTask.recursiveTasks[slackResponse.channel] &&
      parentTask.recursiveTasks[slackResponse.channel].timer) {

    clearInterval(parentTask.recursiveTasks[slackResponse.channel].timer);
    parentTask.recursiveTasks[slackResponse.channel].timer = undefined;

    this.eventEmitter.emit('command:recursive:kill', 
      {
        parsedMessage: slackResponse,
        channels: [slackResponse.channel],
        command: killTask,
        message: {
          /* jshint ignore:start */
          recursive_stop: true
          /* jshint ignore:end */
        }
      }
    );

  } else if (parentTask && parentTask.alertTask &&
      parentTask.alertTask.channel[slackResponse.channel]) {

    if (parentTask.alertTask.channel[slackResponse.channel]) {
      delete parentTask.alertTask.channel[slackResponse.channel];
      this.eventEmitter.emit('command:recursive:kill', {
        parsedMessage: slackResponse,
        channels: [slackResponse.channel],
        command: killTask,
        message: {
          /* jshint ignore:start */
          recursive_stop: true
          /* jshint ignore:end */
        }
      });
    }

    if (_.isEmpty(parentTask.alertTask.channel)) {
      clearInterval(parentTask.alertTask.timer);
      parentTask.alertTask.timer = undefined;
    }
  } else {
    this.eventEmitter.emit('command:recursive:kill',
      {
        parsedMessage: slackResponse,
        channels: [slackResponse.channel],
        command: killTask,
        message: {
          /* jshint ignore:start */
          recursive_fail: true
          /* jshint ignore:end */
        }
      }
    );
  }
};

internals.calculateVariance = function (dataSetArr) {
  var dataSetLength = _.isArray(dataSetArr) ? dataSetArr.length : 0;
  var sentivityPercentage = 0;
  if (dataSetLength > 0 && dataSetLength % 2 === 0) {
    var sdSet1 = Math.abs(internals.standardDeviation(_.slice(dataSetArr, 0, (dataSetLength / 2))));
    var sdSet2 = Math.abs(internals.standardDeviation(_.slice(dataSetArr, dataSetLength / 2)));
    if (sdSet1 !== 0 && sdSet2 !== 0) {
      if (sdSet1 > sdSet2) {
        sentivityPercentage  = Math.floor((sdSet1 - sdSet2) / sdSet1 * 100);
      } else {
        sentivityPercentage  = Math.floor((sdSet2 - sdSet1) / sdSet2 * 100);
      }
      if (sentivityPercentage > 0) {
        return { perct: sentivityPercentage};
      }
    }
  }
};

/**
  http://derickbailey.com/2014/09/21/
  calculating-standard-deviation-with-array-map-
  and-array-reduce-in-javascript/
*/

internals.standardDeviation = function (values) {
  var avg = internals.average(values);
  
  var squareDiffs = values.map(function (value) {
    var diff = value - avg;
    return diff * diff;
  });
  return Math.sqrt(internals.average(squareDiffs));
};

internals.average = function (dataArr) {
  var sum = dataArr.reduce(function(sum, value){
    return sum + value;
  }, 0);

  return sum / dataArr.length;
};

internals.isLimitValid = function (commandModel, slackResponse) {

  if (!commandModel.lowerLimit && !commandModel.upperLimit) {
    return false;
  }

  var responseParam = internals.getParams(slackResponse, 0);
  if (responseParam >= 0) {
    var lowerLimit = parseInt(commandModel.lowerLimit, 10) || 0;
    var upperLimit = parseInt(commandModel.upperLimit, 10) || 0;
    if (_.isNaN(responseParam) || responseParam < lowerLimit || responseParam > upperLimit) {
      return false;
    } else {
      return true;
    }
  } else {
    // assuming that limit is not defined.
    return false;
  }
};

internals.isAllowedParamValid = function (commandModel, slackResponse) {
  if (_.isEmpty(commandModel.allowedParam)) {
    return false;
  }
  var responseParam = internals.getParams(slackResponse, 0);
  if (_.includes(commandModel.allowedParam, responseParam)) {
    return true;
  } else {
    // assuming that limit is not defined.
    return false;
  }
};

internals.isAlertValid = function (commandModel, slackResponse) {
  if (commandModel && commandModel.commandType === internals.commandTypes[3]) {
    if (internals.alertParams[1] === internals.getParams(slackResponse, 0)) {
      return true;
    } else if (!_.includes(internals.alertParams, internals.getParams(slackResponse, 0))) {
      return false;
    } else if (!internals.getParams(slackResponse, 1)) {
      return false;
    }
  }
  return true;
};

internals.isCommandAllowed = function (commandModel, slackResponse, users) {
  if (commandModel && commandModel.allowedUsers) {
    var currentUser = _.find(users, { 'id': slackResponse.user });
    if (currentUser) {
      return _.includes(commandModel.allowedUsers, currentUser.id) ||
        _.includes(commandModel.allowedUsers, currentUser.name);
    } else {
      return true;
    }
  }
  return true;
};

internals.getParams = function (slackResponse, level) {
  if (slackResponse.message.params && slackResponse.message.params.length) {
    if (!_.isNaN(parseInt(slackResponse.message.params[level], 10))) {
      return parseInt(slackResponse.message.params[level], 10);
    }
    return slackResponse.message.params[level];
  }
};

internals.setDefaultParams = function (commandModel, slackResponse, level) {
  var param = internals.getParams(slackResponse, level);
  if (!param && param !== 0 && commandModel.defaultParamValue) {
    slackResponse.message.params = slackResponse.message.params || [];
    slackResponse.message.params[level] = commandModel.defaultParamValue;
    return true;
  }
  return false;
};

internals.buildOptions = function (slackResponse, slackData, purpose) {
  var options = {};
  options.user = _.find(slackData.users, { 'id': slackResponse.user });
  if (purpose && purpose.url) {
    options.hookUrl = purpose.url;
  }
  return options;
};
