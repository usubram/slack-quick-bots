/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2015 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const _ = require('lodash');

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
        this.getData(slackResponse);
        break;
      case internals.commandTypes[1]:
        this.setUpRecursiveTask(commandModel, slackResponse);
        break;
      case internals.commandTypes[2]:
        this.killTask(commandModel, slackResponse);
        break;
      case internals.commandTypes[3]:
        this.handleAlertTask(commandModel, slackResponse)
        break;
    }
  }
};

externals.Command.prototype.loadCommand = function (slackResponse) {
  return new Promise((resolve, reject) => {
    var commandModel = this.commands[slackResponse.message.command];
    if(commandModel) {
      switch (commandModel.commandType) {
        case internals.commandTypes[1]:
          this.setUpRecursiveTask(commandModel, slackResponse);
          resolve('done');
          break;
        case internals.commandTypes[3]:
          this.handleAlertTask(commandModel, slackResponse);
          resolve('done');
          break;
      }
    }
  });
};

externals.Command.prototype.validateCommand = function (slackResponse, cb) {
  var commandModel = this.commands[slackResponse.message.command];
  if (!commandModel) {
    cb(false, {error: true, parsedMessage: slackResponse });
  } else if (!this._isLimitValid(slackResponse) ||
    !this._isAllowedParamValid(slackResponse) ||
    !this._isAlertValid(slackResponse)) {
    cb(false, {limit: true, parsedMessage: slackResponse });
  } else {
    cb(true);
  }
};

externals.Command.prototype.getCommands = function () {
  return this.commands;
};

externals.Command.prototype.getData = function (slackResponse) {
  var commandModel = this.commands[slackResponse.message.command];
  if (!internals._getParams(slackResponse, 0)) {
    slackResponse.message.params = [];
    slackResponse.message.params[0] = commandModel.defaultParamValue;
  }
  var template = commandModel.template();
  var callbackHelper = (data) => {
    if (data && _.isFunction(template)) {
      this.eventEmitter.emit('command:data:respond', {
        channels: [slackResponse.channel],
        message: {
          data: template(data)
        }
      });
    }
  };
  commandModel.data.apply(this,
    [slackResponse.message.command, slackResponse.message.params, callbackHelper]);
};

externals.Command.prototype.getDataForAlert = function (slackResponse) {
  var context = this;
  var commandModel = this.commands[slackResponse.message.command];
  var callbackHelper = function (data) {
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
        var channelsToAlert = _.flatten(_.compact(_.map(commandModel.alertTask.channel,
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
  commandModel.data.apply(null,
    [slackResponse.message.command, slackResponse.message.params, callbackHelper]);
};

externals.Command.prototype.setUpRecursiveTask = function (commandModel, slackResponse) {
  var timer = internals._getParams(slackResponse, 0) || 1;
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
    this.getData(slackResponse);
  }, timer);

  this.eventEmitter.emit('command:setup:recursive',
    {
      parsedMessage: slackResponse,
      channels: [slackResponse.channel],
      message: {
        recursive_success: true,
      }
    }
  );
  this.getData(slackResponse);
};

externals.Command.prototype.handleAlertTask = function (commandModel, slackResponse) {
  if (internals._getParams(slackResponse, 0) === internals.alertParams[1]) {

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

  } else if (internals._getParams(slackResponse, 0) === internals.alertParams[0]) {
    this.setUpAlertTask(commandModel, slackResponse);

    this.eventEmitter.emit('command:setup:alert',
      {
        parsedMessage: slackResponse,
        channels: [slackResponse.channel],
        message: {
          alert_notification: true,
          threshold: internals._getParams(slackResponse, 1) || 75,
        }
      }
    );

    this.getDataForAlert(slackResponse);
  }
};

externals.Command.prototype.setUpAlertTask = function (commandModel, slackResponse) {
  var sentivity = internals._getParams(slackResponse, 1) || 75;
  var timer = commandModel.timeInterval;
  if (commandModel.timeUnit === 'h') {
    timer = timer * 3600000;
  } else {
    timer = timer * 60000; // default to minute
  }

  commandModel.alertTask = commandModel.alertTask ? commandModel.alertTask : {};
  commandModel.alertTask.channel = commandModel.alertTask.channel ? commandModel.alertTask.channel : {};
  commandModel.alertTask.channel[slackResponse.channel] = commandModel.alertTask.channel[slackResponse.channel] || {};

  _.forEach(internals.alertParams, (channel) => {
    _.remove(commandModel.alertTask.channel[slackResponse.channel], (channel) => {
      if (channel && slackResponse.channel === channel) {
        return true;
      }
      return false;
    });
  });

  commandModel.alertTask.channel[slackResponse.channel].sentivity = sentivity;

  if (!commandModel.alertTask.timer) {
    commandModel.alertTask.timer = setInterval(() => {
      this.getDataForAlert(slackResponse);
    }, timer);
  }
};

externals.Command.prototype.killTask = function (commandModel, slackResponse) {
  var killTask = commandModel.parentTask || internals._getParams(slackResponse, 0);
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
          recursive_stop: true
        }
      }
    );

  } else if (parentTask && parentTask.alertTask && parentTask.alertTask.channel[slackResponse.channel]) {

    if (parentTask.alertTask.channel[slackResponse.channel]) {
      delete parentTask.alertTask.channel[slackResponse.channel];
      this.eventEmitter.emit('command:recursive:kill', {
        parsedMessage: slackResponse,
        channels: [slackResponse.channel],
        command: killTask,
        message: {
          recursive_stop: true
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
          recursive_fail: true
        }
      }
    );
  }
};

internals.calculateVariance = function (dataSetArr) {
  var dataSetLength = _.isArray(dataSetArr) ? dataSetArr.length : 0;
  var sentivityPercentage = 0;
  if (dataSetLength > 0 && dataSetLength % 2 === 0) {
    var sdSet1 = Math.abs(internals._standardDeviation(_.slice(dataSetArr, 0, (dataSetLength / 2))));
    var sdSet2 = Math.abs(internals._standardDeviation(_.slice(dataSetArr, dataSetLength / 2)));
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

internals._standardDeviation = function (values) {
  var avg = internals._average(values);
  
  var squareDiffs = values.map(function (value) {
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var avgSquareDiff = internals._average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

internals._average = function (dataArr) {
  var sum = dataArr.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / dataArr.length;
  return avg;
};

externals.Command.prototype._isLimitValid = function (slackResponse) {
  var commandModel = this.commands[slackResponse.message.command];
  var lowerLimit = parseInt(commandModel.lowerLimit, 10);
  var upperLimit = parseInt(commandModel.upperLimit, 10);
  var responseParam = internals._getParams(slackResponse, 0);
  if (commandModel && !_.isNaN(lowerLimit) && !_.isNaN(upperLimit)) {
    if (slackResponse.message &&
      !slackResponse.message.params ||
      !slackResponse.message.params.length) {
      // No params, default to defaultValue
      return true;
    } else if (_.isNaN(responseParam) || responseParam < lowerLimit || responseParam > upperLimit) {
      return false;
    } else {
      return true;
    }
  } else {
    // assuming that limit is not defined.
    return true;
  }
};

externals.Command.prototype._isAllowedParamValid = function (slackResponse) {
  var commandModel = this.commands[slackResponse.message.command];
  var allowedParam = commandModel.allowedParam;
  if (commandModel && allowedParam && allowedParam.length) {
    if (slackResponse.message &&
      !slackResponse.message.params ||
      !slackResponse.message.params.length) {
      return true;
    } else if (!_.includes(allowedParam, internals._getParams(slackResponse, 0))) {
      return false;
    } else {
      return true;
    }
  } else {
    // assuming that limit is not defined.
    return true;
  }
};

externals.Command.prototype._isAlertValid = function (slackResponse) {
  var commandModel = this.commands[slackResponse.message.command];
  if (commandModel.commandType === internals.commandTypes[3]) {
    if (internals.alertParams[1] === internals._getParams(slackResponse, 0)) {
      return true;
    } else if (!_.includes(internals.alertParams, internals._getParams(slackResponse, 0))) {
      return false;
    } else if (!parseInt(internals._getParams(slackResponse, 1))) {
      return false;
    }
  }
  return true;
};

internals._getParams = function (slackResponse, level) {
  if (slackResponse.message.params && slackResponse.message.params.length) {
    return slackResponse.message.params[level];
  }
};
