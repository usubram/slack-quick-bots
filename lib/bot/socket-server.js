'use strict';

// Load modules
import * as lodash from 'lodash-es';
import { createServer } from 'net';
import { WebSocketServer } from 'ws';

import logger from '../utils/logger.js';

const DEFAULT_CONFIG = {
  server: null,
};

const { get } = lodash;
/**
 * Function to create mock socket server.
 *
 * @return {object} Promise object resolve to success or failure.
 */
export function connect() {
  if (DEFAULT_CONFIG.server !== null) {
    return Promise.resolve(DEFAULT_CONFIG.server);
  }

  return Promise.resolve({
    then: (onFulfill) => {
      const server = createServer();
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
}

/**
 * Function to close all client connections to the socet server.
 *
 * @return {object} Promise object resolve to success or failure.
 */
export function closeClient() {
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
}

export function getPort() {
  if (DEFAULT_CONFIG.server && DEFAULT_CONFIG.server.address()) {
    return DEFAULT_CONFIG.server.address().port;
  }

  return;
}

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
    if (get(clientMessage, 'type') === 'message') {
      ws.send(
        JSON.stringify({
          ok: true,
          reply_to: get(clientMessage, 'id'),
          ts: Date.now(),
          message: get(clientMessage, 'text', message),
          type: get(clientMessage, 'type', 'message'),
          user: get(clientMessage, 'user', 'U1234567'),
          channel: get(clientMessage, 'channel', 'C1234567'),
        })
      );
    }
    /* jshint ignore:end */
  } catch (err) {
    logger.info('Invalid socket data ', message);
  }
};
