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
const path = require('path');
const root = '..';

const botLogger = require(path.join(root, '../utils/logger'));
const Command = require(path.join(root, 'command'));
const responseHandler = require(path.join(root, '../bot/response-handler'));
const storage = require(path.join(root, '../storage/storage'));

const externals = {};
const internals = {
  alertParams: ['setup', 'sample']
};

externals.Alert = class extends Command {
  constructor (options) {
    super(options);
    return this;
  }

  preprocess (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        if (this.getParams(parsedMessage, 0) === internals.alertParams[0]) {
          var sentivity = this.getParams(parsedMessage, 1) || 75;
          var time = this.getParams(parsedMessage, 0);
          var alertTaskPath = ['eventStore', parsedMessage.channel + '_' + parsedMessage.message.command];
          var alertTaskChannelPath = _.concat(alertTaskPath, 'channel');
          var alertTaskCurrentChannelPath = _.concat(alertTaskChannelPath, parsedMessage.channel);
          var alertCurrentSentivity = _.concat(alertTaskCurrentChannelPath, 'sentivity');
          var alertTaskTimer = _.concat(alertTaskPath, 'timer');
          var alertCurrentMessage = _.concat(alertTaskCurrentChannelPath, 'parsedMessage');

          time = _.isNumber(time) ? time : 1;
          if (this.getCommand().timeUnit === 'h') {
            time = time * 3600000;
          } else {
            time = time * 60000; // default to minute
          }

          _.set(this, alertCurrentSentivity, sentivity);
          _.set(this, alertCurrentMessage, parsedMessage);

          if (!_.get(this, alertTaskTimer, undefined)) {
            _.set(this, alertTaskTimer, setInterval(() => {
              this.quietRespond(_.get(this, alertCurrentMessage, parsedMessage));
            }, time));
          }

          storage.updateEvents(this.getSlackData().self.name, 'events', {
            parsedMessage: parsedMessage,
            channels: [parsedMessage.channel]
          }).then(() => {
            onFulfill(parsedMessage);
          }).catch((err) => {
            onReject(err);
          });
        } else {
          onFulfill(parsedMessage);
        }
      }
    });
  }

  process (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        this.callback = (data) => {
          onFulfill(this.message.bind(this, parsedMessage)(data));
        };

        try {
          this.getCommand().data.apply(this, [{
            command: parsedMessage.message.command, params: parsedMessage.message.params
          },
            this.buildOptions(parsedMessage, this.getSlackData(), this.purpose),
            this.callback ]);
        } catch (err) {
          botLogger.logger.error('Command: error calling handler,' +
            'make sure to pass a proper function', err, err.stack);
          return onReject(err);
        }
      }
    });
  }

  notify (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill) => {
        if (this.getParams(parsedMessage, 0) === internals.alertParams[0]) {
          this.messageHandler({
            channels: parsedMessage.channel,
            message: responseHandler.generateBotResponseTemplate({
              template: _.isFunction(this.template) ? this.template : '',
              /* jshint ignore:start */
              alert_notification: true,
              /* jshint ignore:end */
              threshold: this.getParams(parsedMessage, 1) || 75,
            })
          });
        }
        onFulfill();
      }
    });
  }

  message (parsedMessage, data) {
    var alertTaskPath = ['eventStore', parsedMessage.channel + '_' + parsedMessage.message.command];
    var alertTaskChannelPath = _.concat(alertTaskPath, 'channel');
    var dataSamplePathVale = _.concat(alertTaskPath, 'dataSample', 'value');
    var dataSamplePathTime = _.concat(alertTaskPath, 'dataSample', 'time');

    if (this.getParams(parsedMessage, 0) === internals.alertParams[1]) {
      this.messageHandler({
        channels: parsedMessage.channel,
        message: responseHandler.generateAlertResponseTemplate({
          template: this.template,
          sample: true,
          dataset: _.get(this, dataSamplePathVale, ''),
          time: _.get(this, dataSamplePathTime, '')
        })
      });
    } else {
      var channelsToAlert = [];
      if (data && data.length > 0) {
        var varianceResult = internals.calculateVariance(data);

        _.set(this, dataSamplePathVale, _.get(this, dataSamplePathVale, []));
        _.set(this, dataSamplePathTime, new Date().toString());

        if (varianceResult && varianceResult.perct) {
          if (_.get(this, dataSamplePathVale, []).length >= 5) {
            _.get(this, dataSamplePathVale, []).pop();
          }

          var alertData = _.get(this, alertTaskChannelPath);
          _.get(this, dataSamplePathVale, []).unshift(varianceResult.perct);
          channelsToAlert = _.flatten(_.compact(_.map(alertData,
            (value, key) => {
              if (varianceResult.perct > _.get(this,
                _.concat(alertTaskChannelPath, key, 'sentivity'), 0)) {
                return key;
              }
            })
          ));
        }

        if (channelsToAlert && channelsToAlert.length > 0) {
          this.messageHandler({
            channels: channelsToAlert,
            message: responseHandler.generateAlertResponseTemplate({
              template: this.template,
              alert: true,
              dataset: data,
              perct: varianceResult.perct,
              time: new Date().toString()
            })
          });
        }
      }
    }
  }

  reloadCommand (parsedMessage) {
    this.preprocess(parsedMessage)
      .catch((err) => {
        botLogger.logger.info('Error processing command ', err);
      });
  }

  setTimer (parsedMessage, job) {
    let alertCommand = internals.getCommandArguments(parsedMessage);
    if (this.getTimer(parsedMessage)) {
      this.getTimer(parsedMessage).stop();
    }

    _.set(this.eventStore,
      [_.get(alertCommand, 'message.command'), 'timer'], job);
  }

  getTimer (parsedMessage) {
    let alertCommand = internals.getCommandArguments(parsedMessage);

    return _.get(this.eventStore,
      [_.get(alertCommand, 'message.command'), 'timer']);
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

module.exports = externals.Alert;
