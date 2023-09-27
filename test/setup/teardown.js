import { closeClient } from '../../lib/bot/socket-server.js';

// module.exports = async function () {
//   console.log('teared down')
//   return await socketServer.closeClient();
// };

afterEach(async () => {
  return await closeClient();
});
