const socketResponse = require('./../mock/socket-response').socketResponse;
const WebSocketServer = require('ws').Server;

exports.connect = function (options) {
  var tm = new WebSocketServer({ port: 4080 })
    .on('connection', function connection(ws) {
      ws.on('message', function incoming(message) {
        ws.send(socketResponse[message]);
      });

      ws.on('close', function incoming(message) {
        console.log('closed');
      });
    }).on('listening', function () {
      console.log('resolve();', this.options.host);
      var serverUrl = 'ws://' + this.options.host + ':' + this.options.port;
      //resolve();
    }).on('error', function () {
      console.log('error();', this);
      //reject();
    });
}

exports.connect();
