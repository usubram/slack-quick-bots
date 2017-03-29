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

externals.setupServer = function (config, handler) {
  var server = http.createServer(handler);
  var port = config.port || internals.defaultPort;
  var hostname = config.hostname || internals.defaultHost;

  return Promise.resolve({
    then: (success, failure) => {
      server.listen(port, hostname, () => {
        botLogger.logger.info('Webhook server listening on ', port, hostname);
        success(server);
      }).on('error', function (err) {
        botLogger.logger.log('Webhook server setup failed %j', err);
        failure(err);
      });
    }
  });

};

module.exports = externals;
