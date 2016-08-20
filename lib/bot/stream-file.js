/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const _ = require('lodash');
const path = require('path');
const plot = require('plotter').plot;
const root = '..';

const botLogger = require(path.join(root, 'utils/logger'));
const postAttachmentFromStream =
  require(path.join(root, 'slackApi/post-attachment')).postAttachmentFromStream;

const externals = {};
const internals = {
  graphFileTypes: ['png', 'svg']
};

externals.StreamFile = class {
  constructor (channel, data, config) {
    console.log('config', config);
    if (data.responseType) {
      config = _.merge(config, data.responseType);
    }
    console.log('config', config);
    if (_.includes(internals.graphFileTypes, config.type) && config.style) {
      return internals.handleGraphResponse(channel, data, config);
    } else {
      return internals.handleFileResponse(channel, data, config);
    }
  }
};

internals.handleGraphResponse = function (channel, data, config) {
  return new Promise((resolve, reject) => {
    var {
      style = 'lines',
      type = 'png',
      logscale = false,
      ylabel = 'y-axis',
      xlabel = 'x-axis',
      exec = '',
      time = ''
    } = config;

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
      finish: function(err, stdout) {
        postAttachmentFromStream(channel, config, stdout)
        .then((response) => {
          resolve(response);
        }).catch((err) => {
          reject(err);
        });
      }
    });
  });
};

internals.handleFileResponse = function (channel, data, config) {
  var requestData = data.response || data;
  return postAttachmentFromStream(channel, config, requestData);
};

internals.generateGraph = function (plotConfig) {
  try {
    plot(plotConfig);
  } catch(err) {
    botLogger.logger.error('StreamFile: error generating graph', err);
  }
};

module.exports = externals.StreamFile;
