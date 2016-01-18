'use strict';

// Load modules
const WebSocketPlugin = require('ws');

let message = {
  'id': '',
  'type': 'ping'
};

exports = module.exports.createSocket = function (botInfo) {
  return new Promise(function (resolve, reject) {
    if (botInfo && botInfo.slackData && botInfo.slackData.url) {
      var slackSocket = new WebSocketPlugin(botInfo.slackData.url);
      slackSocket.on('close', function () {
        console.log('disconnected');
      });
      slackSocket.on('open', function () {
        setInterval(function () {
          slackSocket.send(JSON.stringify(message));
        }, 2000);
      });
      botInfo.ws = slackSocket;
      resolve(botInfo);
    } else {
      reject(false);
    }
  });
};
