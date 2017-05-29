/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2017 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

// Load modules
const _ = require('lodash');
const path = require('path');
const moment = require('moment');
const root = '..';

const logger = require(path.join(root, '../utils/logger'));
const Command = require(path.join(root, 'command'));
const responseHandler = require(path.join(root, '../bot/response-handler'));
const storage = require(path.join(root, '../storage/storage'));

const externals = {};
const internals = {
  alertParams: ['setup'],
  algo: {
    CUMULATIVE_DIFFERENCE: 'CUMULATIVE_DIFFERENCE',
    VARIATION_DIFFERENCE: 'VARIATION_DIFFERENCE',
  },
};

/**
*
* Represents the state and events of an alert command.
*
*/
externals.Alert = class extends Command {
  /**
  * Creates a new Alert instance.
  * @param {object} options command config.
  * @param {object} options.context command context.
  * @param {string} options.commandName command name.
  * @param {function} options.getBotConfig function to get bot config.
  * @param {function} options.getSlackData function to get slack data.
  * @param {function} options.getHttpAgent function to get http proxy agent.
  * @param {function} options.getHook function to get command hook.
  * @param {function} options.getEventStore function to get event store.
  * @param {function} options.messageHandler function to dispatch message.
  * @return {object} instance of this.
  * @class
  */
  constructor (options) {
    super(options);

    return this;
  }

  /**
  * Function to handle pre-process for alert command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @override
  */
  preprocess (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill) => {
        if (this.getParams(parsedMessage, 0) === internals.alertParams[0]) {
          let time = this.getParams(parsedMessage, 0);
          const sentivity = this.getParams(parsedMessage, 1) || 75;
          const alertTaskPath = ['eventStore', parsedMessage.channel +
            '_' + parsedMessage.message.command];
          const alertTaskChannelPath = _.concat(alertTaskPath, 'channel');
          const alertTaskCurrentChannelPath = _.concat(alertTaskChannelPath,
            parsedMessage.channel);
          const alertCurrentSentivity = _.concat(alertTaskCurrentChannelPath,
            'sentivity');
          const alertTaskTimer = _.concat(alertTaskPath, 'timer');
          const alertCurrentMessage = _.concat(alertTaskCurrentChannelPath,
            'parsedMessage');

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
              this.quietRespond(
                _.get(this, alertCurrentMessage, parsedMessage));
            }, time));
          }

          onFulfill(parsedMessage);
        } else {
          onFulfill(parsedMessage);
        }
      },
    });
  }

  /**
  * Function to handle process for alert command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @override
  */
  process (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        this.callback = (data) => {
          onFulfill(this.message.bind(this, parsedMessage)(data));
        };

        try {
          this.getCommand().data.apply(this, [{
            command: parsedMessage.message.command,
            params: parsedMessage.message.params,
          },
            this.buildOptions(parsedMessage,
              this.getSlackData(),
              this.purpose),
            this.callback]);
        } catch (err) {
          logger.error('Command: error calling handler,' +
            'make sure to pass a proper function', err, err.stack);
          return onReject(err);
        }
      },
    });
  }

  /**
  * Function to handle notify for alert command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @override
  */
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
            }),
          });
        }
        onFulfill();
      },
    });
  }

  /**
  * Function to handle message for alert command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @param {object} data result from alert data handler.
  * @override
  */
  message (parsedMessage, data) {
    this.handleAlertMessage(parsedMessage, data);
  }

  /**
  * Function to handle reload command for alert command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @override
  */
  reloadCommand (parsedMessage) {
    this.preprocess(parsedMessage)
      .catch((err) => {
        logger.info('Error processing command ', err);
      });
  }

  /**
  * Function to handle set timer for alert command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @param {object} job instance of timer.
  * @override
  */
  setTimer (parsedMessage, job) {
    let alertCommand = internals.getCommandArguments(parsedMessage);
    if (this.getTimer(parsedMessage)) {
      this.getTimer(parsedMessage).stop();
    }

    _.set(this.eventStore,
      [_.get(alertCommand, 'message.command'), 'timer'], job);
  }

  /**
  * Function to get timer for alert command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @override
  */
  getTimer (parsedMessage) {
    let alertCommand = internals.getCommandArguments(parsedMessage);

    return _.get(this.eventStore,
      [_.get(alertCommand, 'message.command'), 'timer']);
  }

  /**
  * Function to set timer for alert command.
  *
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @override
  */
  setEvent (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        if (this.getParams(parsedMessage, 0) === internals.alertParams[0]) {
          storage.updateEvents(this.getSlackData().self.name, 'events', {
            parsedMessage: parsedMessage,
            channels: [parsedMessage.channel],
          }).then(() => {
            onFulfill(parsedMessage);
          }).catch((err) => {
            onReject(err);
          });
        } else {
          onFulfill(parsedMessage);
        }
      },
    });
  }

  /**
  * Function to handle alert algo.
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @param {object} data result from alert data handler.
  */
  handleAlertMessage (parsedMessage, data) {
    if (this.getCommand().algo === internals.algo.CUMULATIVE_DIFFERENCE) {
      this.handleCumulativeDifference(parsedMessage, data);
    } else if (this.getCommand().algo ===
      internals.algo.VARIATION_DIFFERENCE) {
      this.handleCumulativeDifference(parsedMessage, data);
    }
  }

  /**
  * Function to compute CUMULATIVE_DIFFERENCE algo.
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @param {object} data result from alert data handler.
  */
  handleCumulativeDifference (parsedMessage, data) {
    const alertTaskPath = ['eventStore', parsedMessage.channel +
      '_' + parsedMessage.message.command];
    const alertTaskChannelPath = _.concat(alertTaskPath, 'channel');

    let channelsToAlert = [];

    if (data) {
      const cResult = internals.computeCumulativeDifference(data);
      const alertData = _.get(this, alertTaskChannelPath);
      const result = _.extend({
        template: this.template,
        cumulative_difference_alert: true,
        time: new Date().toString(),
      }, cResult, data);

      channelsToAlert = _.flatten(_.compact(_.map(alertData,
        (value, key) => {
          if (result.difference > _.get(this,
            _.concat(alertTaskChannelPath, key, 'sentivity'), 0)) {
            return key;
          }
        })
      ));

      if (channelsToAlert && channelsToAlert.length > 0) {
        this.messageHandler({
          channels: channelsToAlert,
          message: responseHandler.generateAlertResponseTemplate(result),
        });
      }
    }
  }

  /**
  * Function to compute VARIATION_DIFFERENCE algo.
  * @param {object} parsedMessage Message returned @link command/message.js.
  * @param {object} data result from alert data handler.
  */
  handleVariationDifference (parsedMessage, data) {
    const alertTaskPath = ['eventStore', parsedMessage.channel +
      '_' + parsedMessage.message.command];
    const alertTaskChannelPath = _.concat(alertTaskPath, 'channel');

    let channelsToAlert = [];
    if (data && data.length > 0) {
      const varianceResult = internals.calculateVariance(data);

      if (varianceResult && varianceResult.perct) {
        const alertData = _.get(this, alertTaskChannelPath);

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
          message: responseHandler.generateAlertResponseTemplate(_.extend({
            template: this.template,
            variation_difference_alert: true,
            dataset: data,
            perct: varianceResult.perct,
            time: new Date().toString(),
          }, data)),
        });
      }
    }
  }
};

/**
* Function to compute CUMULATIVE_DIFFERENCE algo.
* @param {object} timeSeriesDataSet Array of time and value pair.
* @return {object} result of the difference between last two data sets.
*/
internals.computeCumulativeDifference = function (timeSeriesDataSet) {
  const sortedDataSetByTime = _.sortBy(timeSeriesDataSet, 'time');
  const sortedDataSetByData = _.sortBy(timeSeriesDataSet, 'value');
  const lastPreviousData = _.last(this.previousDataSet) ||
    _.last(sortedDataSetByTime);
  const currentDataTime = moment.unix(_.get(
    _.last(sortedDataSetByTime), 'time'));
  let result = {};

  if (lastPreviousData &&
      currentDataTime.isAfter(moment.unix(lastPreviousData.time))) {
    let difference = _.first(sortedDataSetByData).value -
      _.last(sortedDataSetByData).value;
    let isHigher = difference > 0;

    result = {
      dataset: timeSeriesDataSet,
      difference: Math.abs(difference),
    };

    if (isHigher) {
      result.isHigher = true;
    } else {
      result.isLower = true;
    }
  }

  this.previousDataSet = _.size(sortedDataSetByTime) > 0 ?
    sortedDataSetByTime : this.previousDataSet;

  return result;
};

/**
* Function to compute variance for dataset.
*
* @param {array} dataSetArr alert input data set.
* @return {object} computed percentage difference.
*/
internals.calculateVariance = function (dataSetArr) {
  const dataSetLength = _.isArray(dataSetArr) ? dataSetArr.length : 0;
  let sentivityPercentage = 0;

  if (dataSetLength > 0 && dataSetLength % 2 === 0) {
    const sdSet1 = Math.abs(internals.standardDeviation(
      _.slice(dataSetArr, 0, (dataSetLength / 2))));
    const sdSet2 = Math.abs(internals.standardDeviation(
      _.slice(dataSetArr, dataSetLength / 2)));

    if (sdSet1 !== 0 && sdSet2 !== 0) {
      if (sdSet1 > sdSet2) {
        sentivityPercentage = Math.floor((sdSet1 - sdSet2) / sdSet1 * 100);
      } else {
        sentivityPercentage = Math.floor((sdSet2 - sdSet1) / sdSet2 * 100);
      }
      if (sentivityPercentage > 0) {
        return {
          perct: sentivityPercentage,
        };
      }
    }
  }
};

/**
  http://derickbailey.com/2014/09/21/
  calculating-standard-deviation-with-array-map-
  and-array-reduce-in-javascript/
*/

/**
* Function to compute standard deviation.
*
* @param {array} values alert input data set.
* @return {string} computed standar deviation.
*/
internals.standardDeviation = function (values) {
  const avg = internals.average(values);
  let squareDiffs = values.map(function (value) {
    let diff = value - avg;
    return diff * diff;
  });

  return Math.sqrt(internals.average(squareDiffs));
};

/**
* Function to compute average.
*
* @param {array} values alert input data set.
* @return {string} computed average.
*/
internals.average = function (values) {
  let sum = values.reduce(function (sum, value) {
    return sum + value;
  }, 0);

  return sum / values.length;
};

module.exports = externals.Alert;
