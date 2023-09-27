'use strict';

import * as lodash from 'lodash-es';
import * as apiRequest from './api-request.js';

const { concat, get } = lodash;

/**
 * Function to make get channel request.
 *
 * @param {object} options http request options.
 * @return {object} api response.
 */
const getChannelsList = function (options) {
  return requestChannelList(options, resultHandler);
};

const resultHandler = function (response, channels = []) {
  return concat(channels, get(response, 'channels'));
};

const requestChannelList = function (options, handler) {
  const excludeMembers = get(options, 'excludeMembers', 1);
  const excludeArchived = get(options, 'excludeArchived', 1);
  const limit = get(options, 'limit', 999);
  const interval = get(options, 'interval');

  const path =
    '/api/channels.list?' +
    'exclude_members=' +
    excludeMembers +
    '&exclude_archived=' +
    excludeArchived +
    '&limit=' +
    limit +
    '&token=' +
    options.botToken;

  return apiRequest.fetchBatchWithRetry(
    {
      agent: options.agent,
      path,
    },
    interval,
    handler
  );
};

export { getChannelsList };
