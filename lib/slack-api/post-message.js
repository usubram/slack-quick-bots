'use strict';

import apiRequest from './api-request.js';

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

export default postMessage;
