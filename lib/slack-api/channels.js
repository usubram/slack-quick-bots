/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2018 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

const _ = require('lodash');
const apiRequest = require('./api-request');

/**
* Function to make get channel request.
*
* @param {object} options http request options.
* @return {object} api response.
*/
module.exports.getChannelsList = function (options) {
  return requestChannelList(options, resultHandler);
};

const resultHandler = function (response, channels = []) {
  channels = _.concat(channels, _.get(response, 'channels'));

  return channels;
};

const requestChannelList = function (options, handler) {
  const excludeMembers = _.get(options, 'excludeMembers', 1);
  const excludeArchived = _.get(options, 'excludeArchived', 1);
  const limit = _.get(options, 'limit', 0);
  const interval = _.get(options, 'interval');

  let path = '/api/channels.list?' +
    'exclude_members='+ excludeMembers +
    '&exclude_archived='+ excludeArchived +
    '&token=' + options.botToken;

  if (limit) {
    path += '&limit=' + limit;
  }

  return apiRequest.fetchBatchWithRetry({
    agent: options.agent,
    path,
  }, interval, handler);
};
