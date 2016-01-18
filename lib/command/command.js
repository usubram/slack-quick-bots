'use strict';

// Load modules
const _ = require('lodash');

const internals = {};

exports = module.exports = internals.Command = function (commands) {
  internals.config = {};
  internals.commandTypes = ['data', 'recursive', 'kill'];
  this.commands = commands;
  return this;
};

internals.Command.prototype.respondToCommand = function (slackResponse, cb) {
  var commandModel = this.commands[slackResponse.message.command];
  if(commandModel) {
    switch (commandModel.commandType) {
      case internals.commandTypes[0]:
        this.getData(commandModel, slackResponse, cb);
        break;
      case internals.commandTypes[1]:
        this.setUpRecursiveTask(commandModel, slackResponse, cb);
        break;
      case internals.commandTypes[2]:
        this.killTask(commandModel, slackResponse);
        break;
    }
  }
};

internals.Command.prototype.validateCommand = function (slackResponse, cb) {
  var commandModel = this.commands[slackResponse.message.command];
  if (!commandModel) {
    cb(false, {reason: 'error', command: slackResponse.message.command});
  } else if (!this._isLimitValid(slackResponse) || !this._isAllowedParamValid(slackResponse)) {
    cb(false, {reason: 'limit', command: slackResponse.message.command});
  } else {
    cb(true);
  }
};

internals.Command.prototype.getData = function (commandModel, slackResponse, cb) {
  if (!this._getParams(slackResponse)) {
    slackResponse.message.params = [];
    slackResponse.message.params[0] = commandModel.defaultParamValue;
  }
  var template = commandModel.template();
  var callbackHelper = function (data) {
    if (data && _.isFunction(template)) {
      cb(template(data));
    }
  };
  commandModel.data.apply(null,
    [slackResponse.message.command, slackResponse.message.params, callbackHelper]);
};

internals.Command.prototype.setUpRecursiveTask = function (commandModel, slackResponse, cb) {
  var timer = this._getParams(slackResponse) || 1;
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
    this.getData(commandModel, slackResponse, cb);
  }, timer);
};

internals.Command.prototype.killTask = function (commandModel, slackResponse) {
  var parentTask = this.commands[commandModel.parentTask];
  if (parentTask && parentTask.recursiveTasks &&
      parentTask.recursiveTasks[slackResponse.channel]) {
    clearInterval(parentTask.recursiveTasks[slackResponse.channel].timer);
  }
};

internals.Command.prototype.getCommands = function () {
  return this.commands;
};

internals.Command.prototype._isLimitValid = function (slackResponse) {
  var commandModel = this.commands[slackResponse.message.command];
  var lowerLimit = parseInt(commandModel.lowerLimit, 10);
  var upperLimit = parseInt(commandModel.upperLimit, 10);
  var responseParam = this._getParams(slackResponse);
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

internals.Command.prototype._isAllowedParamValid = function (slackResponse) {
  var commandModel = this.commands[slackResponse.message.command];
  var allowedParam = commandModel.allowedParam;
  if (commandModel && allowedParam && allowedParam.length) {
    if (slackResponse.message &&
      !slackResponse.message.params ||
      !slackResponse.message.params.length) {
      return true;
    } else if (!_.includes(allowedParam, this._getParams(slackResponse))) {
      return false;
    } else {
      return true;
    }
  } else {
    // assuming that limit is not defined.
    return true;
  }
};

internals.Command.prototype._getParams = function (slackResponse) {
  if (slackResponse.message.params && slackResponse.message.params.length) {
    if (parseInt(slackResponse.message.params[0], 10)) {
      return parseInt(slackResponse.message.params[0], 10);
    } else {
      return slackResponse.message.params[0];
    }
  }
};
