/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2018 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

const apiRequest = require('./api-request');

/**
* Function to make get users group request.
*
* @param {object} options http request options.
* @return {object} api response.
*/
module.exports.getUserGroupsList = function (options) {
  return apiRequest.fetch({
    agent: options.agent,
    path: '/api/usergroups.list?include_users=true&token=' + options.botToken,
  });
};
