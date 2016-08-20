/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _ = require('lodash');
var path = require('path');
var root = '..';

var botLogger = require(path.join(root, '../utils/logger'));
var Command = require(path.join(root, 'command'));
var responseHandler = require(path.join(root, '../bot/response-handler'));
var storage = require(path.join(root, '../storage/storage'));

var externals = {};
var internals = {
  alertParams: ['setup', 'sample']
};

externals.Alert = function (_Command) {
  _inherits(_class, _Command);

  function _class(options) {
    var _ret;

    _classCallCheck(this, _class);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(_class).call(this, options));

    return _ret = _this, _possibleConstructorReturn(_this, _ret);
  }

  _createClass(_class, [{
    key: 'preprocess',
    value: function preprocess(parsedMessage) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        if (_this2.getParams(parsedMessage, 0) === internals.alertParams[0]) {
          var sentivity = _this2.getParams(parsedMessage, 1) || 75;
          var time = _this2.getParams(parsedMessage, 0);
          var alertTaskPath = ['eventStore', parsedMessage.message.command];
          var alertTaskChannelPath = _.concat(alertTaskPath, 'channel');
          var alertTaskCurrentChannelPath = _.concat(alertTaskChannelPath, parsedMessage.channel);
          var alertCurrentSentivity = _.concat(alertTaskCurrentChannelPath, 'sentivity');
          var alertTaskTimer = _.concat(alertTaskPath, 'timer');
          var alertCurrentMessage = _.concat(alertTaskCurrentChannelPath, 'parsedMessage');

          time = _.isNumber(time) ? time : 1;
          if (_this2.getCommand().timeUnit === 'h') {
            time = time * 3600000;
          } else {
            time = time * 60000; // default to minute
          }

          _.set(_this2, alertCurrentSentivity, sentivity);
          _.set(_this2, alertCurrentMessage, parsedMessage);

          if (!_.get(_this2, alertTaskTimer, undefined)) {
            _.set(_this2, alertTaskTimer, setInterval(function () {
              _this2.quietRespond(_.get(_this2, alertCurrentMessage, parsedMessage));
            }, time));
          }

          storage.updateEvents(_this2.getSlackData().self.name, 'events', {
            parsedMessage: parsedMessage,
            channels: [parsedMessage.channel]
          }).then(function () {
            resolve(parsedMessage);
          }).catch(function (err) {
            reject(err);
          });
        } else {
          resolve(parsedMessage);
        }
      });
    }
  }, {
    key: 'process',
    value: function process(parsedMessage) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {

        _this3.callback = function (data) {
          resolve(_this3.message.bind(_this3, parsedMessage)(data));
        };

        try {
          _this3.getCommand().data.apply(_this3, [{
            command: parsedMessage.message.command, params: parsedMessage.message.params
          }, _this3.buildOptions(parsedMessage, _this3.getSlackData(), _this3.purpose), _this3.callback]);
        } catch (err) {
          botLogger.logger.error('Command: error calling handler,' + 'make sure to pass a proper function', err, err.stack);
          return reject(err);
        }
      });
    }
  }, {
    key: 'notify',
    value: function notify(parsedMessage) {
      var _this4 = this;

      return new Promise(function (resolve) {
        if (_this4.getParams(parsedMessage, 0) === internals.alertParams[0]) {
          _this4.messageHandler({
            channels: parsedMessage.channel,
            message: responseHandler.generateBotResponseTemplate({
              template: _this4.template,
              /* jshint ignore:start */
              alert_notification: true,
              /* jshint ignore:end */
              threshold: _this4.getParams(parsedMessage, 1) || 75
            })
          });
        }
        resolve();
      });
    }
  }, {
    key: 'message',
    value: function message(parsedMessage, data) {
      var _this5 = this;

      var alertTaskPath = ['eventStore', parsedMessage.message.command];
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
            channelsToAlert = _.flatten(_.compact(_.map(alertData, function (value, key) {
              if (varianceResult.perct > _.get(_this5, [alertTaskChannelPath, key, 'sentivity'], 0)) {
                return key;
              }
            })));
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
  }, {
    key: 'reloadCommand',
    value: function reloadCommand(parsedMessage) {
      this.preprocess(parsedMessage).catch(function (err) {
        botLogger.logger.info('Error processing command ', err);
      });
    }
  }]);

  return _class;
}(Command);

internals.calculateVariance = function (dataSetArr) {
  var dataSetLength = _.isArray(dataSetArr) ? dataSetArr.length : 0;
  var sentivityPercentage = 0;
  if (dataSetLength > 0 && dataSetLength % 2 === 0) {
    var sdSet1 = Math.abs(internals.standardDeviation(_.slice(dataSetArr, 0, dataSetLength / 2)));
    var sdSet2 = Math.abs(internals.standardDeviation(_.slice(dataSetArr, dataSetLength / 2)));
    if (sdSet1 !== 0 && sdSet2 !== 0) {
      if (sdSet1 > sdSet2) {
        sentivityPercentage = Math.floor((sdSet1 - sdSet2) / sdSet1 * 100);
      } else {
        sentivityPercentage = Math.floor((sdSet2 - sdSet1) / sdSet2 * 100);
      }
      if (sentivityPercentage > 0) {
        return { perct: sentivityPercentage };
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
  var sum = dataArr.reduce(function (sum, value) {
    return sum + value;
  }, 0);

  return sum / dataArr.length;
};

module.exports = externals.Alert;