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
  internals.generateGraph(channel, data, config, callback);
};

internals.generateGraph = function (channel, data, config, callback) {
  try {
    plot({
      data: data,
      time: config.timeUnit || '%m',
      style: config.style || 'lines',
      format: config.type || png,
      title: config.title || 'Graph',
      logscale: config.logscale || false,
      ylabel: config.ylabel || 'y-axis',
      xlabel: config.xlabel || 'x-axis',
      exec: { encoding: 'utf16' },
      finish: function(err, stdout) {
        postAttachmentFromStream(channel, config, stdout, callback);
      }
    });
  } catch(err) {
    botLogger.logger.error('StreamGraph: error generating graph', err);
  }
};
