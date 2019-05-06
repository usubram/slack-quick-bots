'use strict';

const _ = require('lodash');
const apiRequest = require('./api-request');

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
  members = _.concat(members, _.get(response, 'members'));

  return members;
};

const requestUserList = function (options, handler) {
  const presence = _.get(options, 'presence', 0);
  const limit = _.get(options, 'limit', 0);
  const interval = _.get(options, 'interval');

  const path = '/api/users.list?' +
    'limit=' + limit +
    '&presence=' + presence +
    '&token=' + options.botToken;

  return apiRequest.fetchBatchWithRetry({
    agent: options.agent,
    path,
  }, interval, handler);
};

module.exports = {
  getUsersList,
};
