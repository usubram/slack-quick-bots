/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2018 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

// Load modules
const _ = require('lodash');
const WebSocketServer = require('ws').Server;
const path = require('path');
const root = '..';

const logger = require(path.join(root, 'utils/logger'));

const internals = {
  server: null,
};

/**
* Function to create mock socket server.
*
* @return {object} Promise object resolve to success or failure.
*/
module.exports.connect = function () {
  if (internals.server !== null) {
    return Promise.resolve(internals.server);
  }

  return Promise.resolve({
    then: (onFulfill) => {
      internals.server = new WebSocketServer({
        port: 4080,
      })
        .on('connection', function (ws) {
          ws.on('message', function (data) {
            internals.server.clients.forEach(function each (client) {
              if (client === ws) {
                internals.messageHandler(client, data);
              }
            });
          });
        });

      onFulfill();
    },
  });
};

/**
* Function to close all client connections to the socet server.
*
* @return {object} Promise object resolve to success or failure.
*/
module.exports.closeClient = function () {
  return Promise.resolve({
    then: (onFulfill) => {
      internals.server.clients.forEach((client) => {
        client.close();
        onFulfill();
      });
    },
  });
};

/**
* Function to handle incoming messages to the mock server.
* @param {object} ws web socket client instance.
* @param {object} message message send to the server.
*
*/
internals.messageHandler = function (ws, message) {
  let clientMessage;

  try {
    clientMessage = JSON.parse(message);
    /* jshint ignore:start */
    if (_.get(clientMessage, 'type') === 'message') {
      ws.send(JSON.stringify({
        ok: true,
        reply_to: _.get(clientMessage, 'id'),
        ts: Date.now(),
        message: _.get(clientMessage, 'text', message),
        type: _.get(clientMessage, 'type', 'message'),
        user: _.get(clientMessage, 'user', 'U1234567'),
        channel: _.get(clientMessage, 'channel', 'C1234567'),
      }));
    }
    /* jshint ignore:end */
  } catch (err) {
    logger.info('Invalid socket data ', message);
  }
};

/**
* Function to broadcast message to all connected clients.
* @param {object} data message to be broadcast.
*
*/
internals.broadcast = function (data) {
  let broadcastData;

  try {
    broadcastData = JSON.parse(data);
  } catch (err) {
    logger.info('Error in broadcasting data ', data);
  }

  if (_.get(broadcastData, 'type') !== 'ping') {
    internals.server.clients.forEach(function (client) {
      client.send(data);
    });
  }
};
