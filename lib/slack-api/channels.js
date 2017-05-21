/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2017 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

const apiRequest = require('./api-request');

/**
* Function to make get channel request.
*
* @param {object} options http request options.
* @return {object} api response.
*/
module.exports.getChannelsList = function (options) {
  return apiRequest.fetch({
    agent: options.agent,
    path: '/api/channels.list?' +
      'exclude_members=true&exclude_archived=true&token=' + options.botToken,
  });
};
