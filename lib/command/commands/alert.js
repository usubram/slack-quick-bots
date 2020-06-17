'use strict';

// Load modules
const _ = require('lodash');
const path = require('path');
const moment = require('moment');
const shortid = require('shortid');
const root = '..';

const logger = require(path.join(root, '../utils/logger'));
const { Command } = require(path.join(root, 'command'));
const responseHandler = require(path.join(root, '../bot/response-handler'));

const DEFAULT_CONFIG = {
  alertParams: ['SETUP', 'LIST'],
  algo: {
    CUMULATIVE_DIFFERENCE: 'CUMULATIVE_DIFFERENCE',
    CONSISTENT_VARIATION: 'CONSISTENT_VARIATION',
  },
};

/**
 *
 * Represents the state and events of an alert command.
 *
 */
const Alert = class extends Command {
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
  constructor(options) {
    super(options);

    return this;
  }

  /**
   * Function to handle pre-process for alert command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @override
   */
  preprocess(parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        if (
          this.getParams(parsedMessage, 0) === DEFAULT_CONFIG.alertParams[0]
        ) {
          const currentParams = (this.getParams(parsedMessage) || []).join('');

          parsedMessage.scheduleId =
            parsedMessage.scheduleId || _.toLower(shortid.generate());

          this.alertTaskChannelPath = [this.commandName, 'tasks'];
          this.alertTaskTimerPath = [this.commandName, 'timer'];

          const alertEvents = _.get(
            this.getEventStore().get(),
            this.alertTaskChannelPath
          );

          const isAlertExist = _.filter(_.values(alertEvents), (alertEvent) => {
            return (
              alertEvent &&
              _.isEqual(
                currentParams,
                (this.getParams(alertEvent.parsedMessage) || []).join('')
              ) &&
              parsedMessage.channel === alertEvent.parsedMessage.channel
            );
          });

          if (isAlertExist.length > 0) {
            this.messageHandler({
              channels: parsedMessage.channel,
              message: responseHandler.generateBotResponseTemplate({
                parsedMessage: parsedMessage,
                alertExist: true,
                commandName: this.commandName,
                botName: this.getEventStore().botName,
              }),
              thread: parsedMessage.thread_ts,
            });

            return onReject(new Error('Alert with arguments already exist'));
          }

          let time = this.getParams(parsedMessage, 0);
          time = _.isNumber(time) && time > 0 ? time : 1;
          if (this.getCommand().timeUnit === 'h') {
            time = time * 3600000;
          } else {
            time = time * 60000; // default to minute
          }

          this.setTimer(parsedMessage, this.alertTaskTimerPath, time);
          this.setupAlertTypeSpecifics(parsedMessage);
        }

        return onFulfill(parsedMessage);
      },
    });
  }

  /**
   * Function to respond to command message.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @return {object} Promise resolves to success or failure.
   * @override
   */
  respond(parsedMessage) {
    if (this.isScheduleList(parsedMessage)) {
      return this.process(parsedMessage).catch((err) => {
        logger.error('Error processing command ', err);
      });
    }

    return this.preprocess(parsedMessage)
      .then(() => {
        return this.setEvent(parsedMessage);
      })
      .then(() => {
        return this.notify(parsedMessage);
      })
      .then(() => {
        return this.process(parsedMessage);
      })
      .catch((err) => {
        logger.error('Error processing command ', err);
      });
  }

  /**
   * Function to handle process for alert command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @override
   */
  process(parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        if (this.isScheduleList(parsedMessage)) {
          const scheduledEvents = this.getScheduledEvents(parsedMessage);
          const noEvents = (scheduledEvents || []).length < 1;

          this.messageHandler({
            channels: parsedMessage.channel,
            message: responseHandler.generateBotResponseTemplate({
              parsedMessage: parsedMessage,
              noAlertEvents: noEvents,
              alertEvents: scheduledEvents,
              commandName: this.commandName,
              botName: this.getEventStore().botName,
            }),
            thread: parsedMessage.thread_ts,
          });

          return onFulfill();
        }

        const alertEvents = _.get(
          this.getEventStore().get(),
          this.alertTaskChannelPath
        );

        const callback = (eventKey, err, data) => {
          this.message.apply(this, [err, data, eventKey]);
        };

        _.each(_.values(alertEvents), (alertEvent) => {
          if (typeof this.getCommand().snooze === 'function') {
            const shouldSnooze = this.getCommand().snooze.apply(this, [
              {
                command: alertEvent.parsedMessage.message.command,
                params: alertEvent.parsedMessage.message.params,
              },
            ]);

            if (shouldSnooze) {
              logger.log('Snoozing alert', { time: new Date() });
              return;
            }
          }

          alertEvent.handler.apply(this, [
            {
              command: alertEvent.parsedMessage.message.command,
              params: alertEvent.parsedMessage.message.params,
            },
            this.buildOptions(
              alertEvent.parsedMessage,
              this.getSlackData(),
              this.purpose
            ),
            _.partial(callback, alertEvent.parsedMessage.scheduleId),
          ]);
        });

        return onFulfill();
      },
    });
  }

  /**
   * Function to handle vaidation for schedule command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @override
   */
  validate(parsedMessage) {
    const task = this.getParams(parsedMessage, 0);

    if (task === 'LIST') {
      return Promise.resolve();
    }

    this.setDefaultParams(this.getCommand(), parsedMessage);

    const allowedParamValid = this.validateCommandArgs(
      this.getCommand(),
      parsedMessage
    );

    if (allowedParamValid.isNoop || allowedParamValid.isValid) {
      return Promise.resolve();
    }

    if (!allowedParamValid.isNoop && !allowedParamValid.isValid) {
      return Promise.reject({
        param: true,
        mParams: allowedParamValid.isMultiParam,
        failedParams: allowedParamValid.failedParams,
        sampleParams: allowedParamValid.sampleParams,
        noOfErrors: allowedParamValid.noOfErrors,
        parsedMessage,
      });
    }

    return Promise.resolve();
  }

  /**
   * Function to handle notify for alert command.
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @override
   */
  notify(parsedMessage) {
    return Promise.resolve({
      then: (onFulfill) => {
        if (
          this.getParams(parsedMessage, 0) === DEFAULT_CONFIG.alertParams[0]
        ) {
          this.messageHandler({
            channels: parsedMessage.channel,
            message: responseHandler.generateBotResponseTemplate({
              template: _.isFunction(this.template) ? this.template : '',
              /* jshint ignore:start */
              alertNotification: true,
              /* jshint ignore:end */
              commandName: this.commandName,
              botName: this.getEventStore().botName,
              threshold: this.getParams(parsedMessage, 1) || 75,
              thread: parsedMessage.thread_ts,
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
   * @param {object} err err from alert data handler.
   * @param {object} data result from alert data handler.
   * @override
   */
  message(err, data, eventKey) {
    if (err) {
      logger.info('Error from alert handler', err);
      return;
    }

    this.handleAlertMessage(data, eventKey);
  }

  /**
   * Function to handle reload command for alert command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @override
   */
  reloadCommand(parsedMessage) {
    this.preprocess(parsedMessage).catch((err) => {
      logger.info('Error processing command ', err);
    });
  }

  /**
   * Function to handle alert algo.
   * @param {object} parsedMessage Message returned @link command/message.js.
   */
  setupAlertTypeSpecifics(parsedMessage) {
    const sensitivity = this.getParams(parsedMessage, 1) || 75;
    let events = {};
    const channels = {};

    _.set(channels, parsedMessage.scheduleId, {
      parsedMessage: parsedMessage,
      sensitivity: sensitivity,
      commandType: this.getCommand().commandType,
      handler: this.getCommand().data,
    });
    events = _.merge(
      {},
      _.get(this.getEventStore().get(), this.alertTaskChannelPath, {}),
      channels
    );

    this.getEventStore().set(this.alertTaskChannelPath, events);
  }

  /**
   * Function to handle alert algo.
   * @param {object} data result from alert data handler.
   * @param {string} eventKey event key for the alert
   */
  handleAlertMessage(data, eventKey) {
    if (this.getCommand().algo === DEFAULT_CONFIG.algo.CUMULATIVE_DIFFERENCE) {
      this.handleCumulativeDifference(data, eventKey);
    } else if (
      this.getCommand().algo === DEFAULT_CONFIG.algo.CONSISTENT_VARIATION
    ) {
      this.handleVariationDifference(data, eventKey);
    }
  }

  /**
   * Function to compute CUMULATIVE_DIFFERENCE algo.
   * @param {object} data result from alert data handler.
   * @param {string} eventKey event key for the alert
   */
  handleCumulativeDifference(data, eventKey) {
    if (data) {
      const alertData = _.get(
        this.getEventStore().get(),
        _.concat(this.alertTaskChannelPath, eventKey)
      );
      const sensitivity = _.get(alertData, 'sensitivity');
      const isPercentage = _.endsWith(sensitivity, '%');
      const cResult = computeCumulativeDifference(
        data,
        _.get(alertData, 'previousDataSet'),
        isPercentage
      );

      alertData.previousDataSet = cResult.previousDataSet;
      this.getEventStore().set(
        _.concat(this.alertTaskChannelPath, eventKey),
        alertData
      );

      const result = _.extend(
        {
          template: this.template,
          cumulativeDifferenceAlert: true,
          time: new Date().toString(),
          params: alertData.parsedMessage.message.params,
        },
        cResult,
        data
      );

      if (Math.abs(result.difference) > parseInt(sensitivity, 10)) {
        this.messageHandler({
          channels: [alertData.parsedMessage.channel],
          message: responseHandler.generateAlertResponseTemplate(result),
        });
      }
    }
  }

  /**
   * Function to compute CONSISTENT_VARIATION algo.
   * @param {object} data result from alert data handler.
   * @param {string} eventKey event key for the alert
   */
  handleVariationDifference(data, eventKey) {
    let alertData;
    if (data && data.length > 0) {
      const varianceResult = calculateVariance(data);

      if (varianceResult && varianceResult.perct) {
        alertData = _.get(this, _.concat(this.alertTaskChannelPath, eventKey));
      }

      if (varianceResult.perct > _.get(alertData, 'sensitivity')) {
        this.messageHandler({
          channels: [alertData.parsedMessage.channel],
          message: responseHandler.generateAlertResponseTemplate(
            _.extend(
              {
                template: this.template,
                consistentVariationAlert: true,
                dataset: data,
                perct: varianceResult.perct,
                time: new Date().toString(),
                params: alertData.parsedMessage.message.params,
              },
              data
            )
          ),
        });
      }
    }
  }

  /**
   * Function to handle set timer for alert command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @param {object} path path of timer.
   * @param {object} timeInterval time interval to call quietRespond.
   * @override
   */
  setTimer(parsedMessage, path, timeInterval) {
    const timer = this.getTimer(parsedMessage, path);

    if (!timer) {
      this.getEventStore().set(
        path,
        setInterval(() => {
          this.quietRespond(parsedMessage);
        }, timeInterval)
      );
    }
  }

  /**
   * Function to set event for alert command.
   *
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @override
   */
  setEvent(parsedMessage) {
    return this.getEventStore()
      .update(
        {
          eventType: 'events',
          id: parsedMessage.scheduleId,
        },
        {
          parsedMessage: parsedMessage,
          channels: [parsedMessage.channel],
        }
      )
      .then(() => parsedMessage);
  }
};

/**
 * Function to compute CUMULATIVE_DIFFERENCE algo.
 * @param {object} timeSeriesDataSet Array of time and value pair.
 * @param {object} previousDataSet Pervious data set for comparision.
 * @param {boolean} isPercentage flag to calculate percentage difference.
 * @return {object} result of the difference between last two data sets.
 */
const computeCumulativeDifference = function (
  timeSeriesDataSet,
  previousDataSet,
  isPercentage
) {
  const sortedDataSetByTime = _.sortBy(timeSeriesDataSet, 'time');
  const lastPreviousData =
    _.last(previousDataSet) || _.last(sortedDataSetByTime);
  const currentDataTime = _.get(_.last(sortedDataSetByTime), 'time');
  const isFuture = currentDataTime
    ? moment.unix(currentDataTime).isAfter(moment.unix(lastPreviousData.time))
    : false;
  let result = {};

  if (lastPreviousData && isFuture) {
    const lastValue = _.last(sortedDataSetByTime).value;
    const firstValue = _.first(sortedDataSetByTime).value;
    const difference = lastValue - firstValue;
    const isHigher = lastValue > firstValue;

    if (isPercentage) {
      const differencePerct = Math.abs(
        Math.round((difference / firstValue) * 100)
      );

      result = {
        dataset: timeSeriesDataSet,
        difference: differencePerct,
        unit: '%',
      };
    } else {
      result = {
        dataset: timeSeriesDataSet,
        difference: Math.abs(difference),
      };
    }

    if (isHigher) {
      result.isHigher = true;
    } else {
      result.isLower = true;
    }
  }

  result.previousDataSet =
    _.size(sortedDataSetByTime) > 0 ? sortedDataSetByTime : previousDataSet;

  return result;
};

/**
 * Function to compute variance for dataset.
 *
 * @param {array} dataSetArr alert input data set.
 * @return {object} computed percentage difference.
 */
const calculateVariance = function (dataSetArr) {
  const dataSetLength = _.isArray(dataSetArr) ? dataSetArr.length : 0;
  let sensitivityPercentage = 0;

  if (dataSetLength > 0 && dataSetLength % 2 === 0) {
    const sdSet1 = Math.abs(
      standardDeviation(_.slice(dataSetArr, 0, dataSetLength / 2))
    );
    const sdSet2 = Math.abs(
      standardDeviation(_.slice(dataSetArr, dataSetLength / 2))
    );

    if (sdSet1 !== 0 && sdSet2 !== 0) {
      if (sdSet1 > sdSet2) {
        sensitivityPercentage = Math.floor(((sdSet1 - sdSet2) / sdSet2) * 100);
      } else {
        sensitivityPercentage = Math.floor(((sdSet2 - sdSet1) / sdSet1) * 100);
      }
      if (sensitivityPercentage > 0) {
        return {
          perct: sensitivityPercentage,
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
const standardDeviation = function (values) {
  const avg = average(values);
  const squareDiffs = values.map(function (value) {
    const diff = value - avg;
    return diff * diff;
  });

  return Math.sqrt(average(squareDiffs));
};

/**
 * Function to compute average.
 *
 * @param {array} values alert input data set.
 * @return {string} computed average.
 */
const average = function (values) {
  const sum = values.reduce(function (sum, value) {
    return sum + value;
  }, 0);

  return sum / values.length;
};

module.exports = {
  Alert,
};
