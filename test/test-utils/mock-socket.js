const socketResponse = require('./../mock/socket-response').socketResponse;

var WebSocketServer = require('ws').Server;
exports.connect = function () {
  var wss = new WebSocketServer({ port: 4080 });
  wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
      ws.send(socketResponse[message]);
    });

    ws.on('close', function incoming(message) {
      console.log('closed');
    });
  });
  return wss;
}
