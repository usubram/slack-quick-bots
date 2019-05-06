'use strict';

const _ = require('lodash');
const apiRequest = require('./api-request');

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
  return _.concat(channels, _.get(response, 'channels'));
};

const requestChannelList = function (options, handler) {
  const excludeMembers = _.get(options, 'excludeMembers', 1);
  const excludeArchived = _.get(options, 'excludeArchived', 1);
  const limit = _.get(options, 'limit', 999);
  const interval = _.get(options, 'interval');

  const path = '/api/channels.list?' +
    'exclude_members='+ excludeMembers +
    '&exclude_archived='+ excludeArchived +
    '&limit=' + limit +
    '&token=' + options.botToken;

  return apiRequest.fetchBatchWithRetry({
    agent: options.agent,
    path,
  }, interval, handler);
};

module.exports = {
  getChannelsList,
};
