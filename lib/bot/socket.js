'use strict';

// Load modules
const WebSocketPlugin = require('ws');

let message = {
  'id': '',
  'type': 'ping'
};

exports = module.exports = function(botInfo) {
  return new Promise(function(resolve) {
    var slackSocket = new WebSocketPlugin(botInfo.slackData.url);
    slackSocket.on('close', function() {
      console.log('disconnected');
    });
    slackSocket.on('open', function() {      
      setInterval(function() {
        slackSocket.send(JSON.stringify(message));
      }, 2000);
    });
    botInfo.ws = slackSocket;
    resolve(botInfo);
  });
};
