const socketServer = require('../../lib/bot/socket-server');

// module.exports = async function () {
//   console.log('teared down')
//   return await socketServer.closeClient();
// };

afterEach(async () => {
  return await socketServer.closeClient();
});
