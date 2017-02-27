/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules

var _ = require('lodash');
var WebSocketServer = require('ws').Server;
var path = require('path');
var root = '..';

var botLogger = require(path.join(root, 'utils/logger'));

var internals = {
  server: null
};

module.exports.connect = function () {
  if (internals.server !== null) {
    return Promise.resolve(internals.server);
  }

  return Promise.resolve({
    then: function then(onFulfill) {
      internals.server = new WebSocketServer({ port: 4080 }).on('connection', function (ws) {

        ws.on('message', function (data) {
          internals.server.clients.forEach(function each(client) {
            if (client === ws) {
              internals.messageHandler(client, data);
            }
          });
        });
      });

      onFulfill();
    }
  });
};

module.exports.closeClient = function () {
  return Promise.resolve({
    then: function then(onFulfill) {
      internals.server.clients.forEach(function (client) {
        client.close();
        onFulfill();
      });
    }
  });
};

internals.messageHandler = function (ws, message) {
  var clientMessage;
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
        channel: _.get(clientMessage, 'channel', 'C1234567')
      }));
    }
    /* jshint ignore:end */
  } catch (err) {
    botLogger.logger.info('Invalid socket data ', message);
  }
};

internals.broadcast = function (data) {
  var broadcastData;
  try {
    broadcastData = JSON.parse(data);
  } catch (err) {
    botLogger.logger.info('Error in broadcasting data ', data);
  }
  if (_.get(broadcastData, 'type') !== 'ping') {
    internals.server.clients.forEach(function (client) {
      client.send(data);
    });
  }
};