/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const _ = require('lodash');
const path = require('path');
const WebSocketPlugin = require('ws');
const root = '..';

const botLogger = require(path.join(root, 'utils/logger'));
const connector = require(path.join(root, 'connector'));

function createWebSocket (botInfo) {
  return new WebSocketPlugin(botInfo.slackData.url);
}

function createWebSocketPromise (botInfo) {
  return new Promise(function (resolve, reject) {
    if (_.get(botInfo, 'slackData.url')) {
      botInfo.ws = createWebSocket(botInfo);
      resolve(botInfo);
    } else {
      reject(false);
    }
  });
}

exports = module.exports.createSocket = function (botInfo) {
  return createWebSocketPromise(botInfo);
};

exports = module.exports.closeConnection = function (botInfo) {
  if (botInfo.ws) {
    botInfo.shutdown = true;
    botInfo.ws.close();
  }
};

exports = module.exports.reconnect = function (botInfo) {
  if (botInfo.reconnection === false || !botInfo.shutdown) {
    botInfo.reconnection = true;
  } else {
    botLogger.logger.info('Socket: already reconnection in progress');
    return;
  }
  botLogger.logger.info('Socket: attempting to reconnect for bot', botInfo.botName);
  var promiseItem = Promise.resolve();
  return promiseItem.then(function () {
    botLogger.logger.info('Socket: calling startRTM');
    return connector.connect(botInfo);
  }).then(function (slackResponse) {
    createWebSocketPromise(slackResponse);
  }).catch(function (err, reason) {
    botLogger.logger.info('Socket: error', err);
    botLogger.logger.info('Socket: failed reason', reason);
  });
};
