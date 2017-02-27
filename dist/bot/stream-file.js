/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');
var path = require('path');
var plot = require('plotter').plot;
var root = '..';

var botLogger = require(path.join(root, 'utils/logger'));
var postAttachmentFromStream = require(path.join(root, 'slackApi/post-attachment')).postAttachmentFromStream;

var externals = {};
var internals = {
  graphFileTypes: ['png', 'svg']
};

externals.StreamFile = function () {
  function _class(channel, data, config) {
    _classCallCheck(this, _class);

    if (data.responseType) {
      config = _.merge(config, data.responseType);
    }
    if (_.includes(internals.graphFileTypes, config.type) && config.style) {
      return internals.handleGraphResponse(channel, data, config);
    } else {
      return internals.handleFileResponse(channel, data, config);
    }
  }

  return _class;
}();

internals.handleGraphResponse = function (channel, data, config) {
  return Promise.resolve({
    then: function then(onFulfill, onReject) {
      var _config$style = config.style,
          style = _config$style === undefined ? 'lines' : _config$style,
          _config$type = config.type,
          type = _config$type === undefined ? 'png' : _config$type,
          _config$logscale = config.logscale,
          logscale = _config$logscale === undefined ? false : _config$logscale,
          _config$ylabel = config.ylabel,
          ylabel = _config$ylabel === undefined ? 'y-axis' : _config$ylabel,
          _config$xlabel = config.xlabel,
          xlabel = _config$xlabel === undefined ? 'x-axis' : _config$xlabel,
          _config$exec = config.exec,
          exec = _config$exec === undefined ? '' : _config$exec,
          _config$time = config.time,
          time = _config$time === undefined ? '' : _config$time;


      internals.generateGraph({
        data: data.response || data,
        style: style,
        format: type,
        title: config.title,
        logscale: logscale,
        ylabel: ylabel,
        xlabel: xlabel,
        time: time,
        exec: exec,
        finish: function finish(err, stdout) {
          postAttachmentFromStream(channel, config, stdout).then(function (response) {
            onFulfill(response);
          }).catch(function (err) {
            onReject(err);
          });
        }
      });
    }
  });
};

internals.handleFileResponse = function (channel, data, config) {
  var requestData = data.response || data;
  return postAttachmentFromStream(channel, config, requestData);
};

internals.generateGraph = function (plotConfig) {
  try {
    plot(plotConfig);
  } catch (err) {
    botLogger.logger.error('StreamFile: error generating graph', err);
  }
};

module.exports = externals.StreamFile;