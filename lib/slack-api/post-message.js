'use strict';

const apiRequest = require('./api-request');

/**
 * Function to make post message to slack.
 *
 * @param {object} options http request options.
 * @return {object} data.
 */
const postMessage = function (options, data) {
  const path = '/api/chat.postMessage';

  return apiRequest.post(
    {
      agent: options.agent,
      path,
      botToken: options.botToken,
    },
    Object.assign({ as_user: true }, data)
  );
};

module.exports = postMessage;
