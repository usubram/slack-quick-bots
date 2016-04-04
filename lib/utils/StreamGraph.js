/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2015 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const Writable = require('stream').Writable;
const util = require('util');
const plot = require('plotter').plot;
const botLogger = require('./logger');
const postAttachmentFromStream = require('./../../lib/slackApi/postAttachment').postAttachmentFromStream;

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
      format: 'svg',
      title: config.title || 'Graph',
      logscale: config.logscale || false,
      ylabel: config.ylabel || '',
      finish: function(err, stdout, stderr) {
        postAttachmentFromStream(channel, config, stdout, callback);
      }
    });
  } catch(err) {
    botLogger.log.error('StreamGraph: error generating graph', err);
  }
};
