/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const plot = require('plotter').plot;
const botLogger = require('./logger');
const postAttachmentFromStream =
  require('./../../lib/slackApi/postAttachment').postAttachmentFromStream;

const internals = {
  store: {}
};
const externals = {};

exports = module.exports = externals.StreamGraph = function (channel, data, config, callback) {

  config.style = config.style || 'lines',
  config.type = config.type || 'png',
  config.title = config.title || 'Graph',
  config.logscale = config.logscale || false,
  config.ylabel = config.ylabel || 'y-axis',
  config.xlabel = config.xlabel || 'x-axis',

  internals.generateGraph(channel, data, config, callback);
};

internals.generateGraph = function (channel, data, config, callback) {
  if (!data) {
    return callback('No data passed');
  }

  var plotConfig = {
    data: data.response || data,
    style: data.style || config.style,
    format: data.type || config.type,
    title: data.title || config.title,
    logscale: data.logscale || config.logscale,
    ylabel: data.ylabel || config.ylabel,
    xlabel: data.xlabel || config.xlabel,
    exec: config.exec,
    finish: function(err, stdout) {
      postAttachmentFromStream(channel, config, stdout, callback);
    }
  };
  if (config.timeUnit) {
    plotConfig.time = config.timeUnit
  }
  
  try {
    plot(plotConfig);
  } catch(err) {
    botLogger.logger.error('StreamGraph: error generating graph', err);
  }
};
