/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const http = require('http');
const path = require('path');
const root = '..';

const botLogger = require(path.join(root, 'utils/logger'));

const externals = {};
const internals = {
  defaultPort: 8080,
  defaultHost: '0.0.0.0'
};

externals.setupServer = function (config, handler, callback) {
  var server = http.createServer(handler);
  var port = config.port || internals.defaultPort;
  var hostname = config.hostname || internals.defaultHost;
  server.listen(port, hostname, function () {
    botLogger.logger.info('Server listening on ', port, config.hostname);
    callback(null, server);
  }).on('error', function (err) {
    if (err) {
      throw new Error(err);
    }
    callback(true);
  });
};

module.exports = externals;
