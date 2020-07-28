'use strict';

// Load modules
const _ = require('lodash');
const net = require('net');
const WebSocketServer = require('ws').Server;

const logger = require('../utils/logger');

const DEFAULT_CONFIG = {
  server: null,
};

/**
 * Function to create mock socket server.
 *
 * @return {object} Promise object resolve to success or failure.
 */
module.exports.connect = function () {
  if (DEFAULT_CONFIG.server !== null) {
    return Promise.resolve(DEFAULT_CONFIG.server);
  }

  return Promise.resolve({
    then: (onFulfill) => {
      const server = net.createServer();
      server.listen();

      server.on('listening', () => {
        const port = server.address().port;
        server.close();

        DEFAULT_CONFIG.server = new WebSocketServer({
          port,
        }).on('connection', function (ws) {
          ws.on('message', function (data) {
            DEFAULT_CONFIG.server.clients.forEach(function each(client) {
              if (client === ws) {
                messageHandler(client, data);
              }
            });
          });
        });

        onFulfill();
      });
    },
  });
};

/**
 * Function to close all client connections to the socet server.
 *
 * @return {object} Promise object resolve to success or failure.
 */
module.exports.closeClient = function () {
  if (!DEFAULT_CONFIG.server) {
    return;
  }

  return Promise.resolve({
    then: (onFulfill) => {
      DEFAULT_CONFIG.server.clients.forEach((client) => {
        client.close();
      });
      DEFAULT_CONFIG.server.close(() => {
        DEFAULT_CONFIG.server = null;
        onFulfill();
      });
    },
  });
};

module.exports.getPort = function () {
  if (DEFAULT_CONFIG.server && DEFAULT_CONFIG.server.address()) {
    return DEFAULT_CONFIG.server.address().port;
  }

  return;
};

/**
 * Function to handle incoming messages to the mock server.
 * @param {object} ws web socket client instance.
 * @param {object} message message send to the server.
 *
 */
const messageHandler = function (ws, message) {
  let clientMessage;

  try {
    clientMessage = JSON.parse(message);
    /* jshint ignore:start */
    if (_.get(clientMessage, 'type') === 'message') {
      ws.send(
        JSON.stringify({
          ok: true,
          reply_to: _.get(clientMessage, 'id'),
          ts: Date.now(),
          message: _.get(clientMessage, 'text', message),
          type: _.get(clientMessage, 'type', 'message'),
          user: _.get(clientMessage, 'user', 'U1234567'),
          channel: _.get(clientMessage, 'channel', 'C1234567'),
        })
      );
    }
    /* jshint ignore:end */
  } catch (err) {
    logger.info('Invalid socket data ', message);
  }
};
