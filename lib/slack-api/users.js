'use strict';

import apiRequest from './api-request.js';
import * as lodash from 'lodash-es';

const { concat, get } = lodash;

/**
 * Function to make get users request.
 *
 * @param {object} options http request options.
 * @return {object} api response.
 */
const getUsersList = function (options) {
  return requestUserList(options, resultHandler);
};

const resultHandler = function (response, members = []) {
  members = concat(members, get(response, 'members'));

  return members;
};

const requestUserList = function (options, handler) {
  const presence = get(options, 'presence', 0);
  const limit = get(options, 'limit', 0);
  const interval = get(options, 'interval');

  const path =
    '/api/users.list?' +
    'limit=' +
    limit +
    '&presence=' +
    presence +
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

const getUserInfo = function (options) {
  const user = get(options, 'userId');

  const path =
    '/api/users.info?' + 'user=' + user + '&token=' + options.botToken;

  return apiRequest.fetch({
    agent: options.agent,
    path,
  });
};

export { getUsersList, getUserInfo };
