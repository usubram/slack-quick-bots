/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2017 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

// Load modules
const http = require('http');
const path = require('path');
const root = '..';

const logger = require(path.join(root, 'utils/logger'));

const externals = {};
const internals = {
  defaultPort: 8080,
  defaultHost: '0.0.0.0',
};


/**
* Function to create http server for webhook.
* @param {object} config hook config.
* @param {function} handler handler for the bot.
*
* @return {object} Promise object resolve to success or failure.
*/
externals.setupServer = function (config, handler) {
  const server = http.createServer(handler);
  const port = config.port || internals.defaultPort;
  const hostname = config.hostname || internals.defaultHost;

  return Promise.resolve({
    then: (success, failure) => {
      server.listen(port, hostname, () => {
        logger.info('Webhook server listening on ', port, hostname);
        success(server);
      }).on('error', function (err) {
        logger.log('Webhook server setup failed %j', err);
        failure(err);
      });
    },
  });
};

module.exports = externals;
