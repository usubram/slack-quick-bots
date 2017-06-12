/*
* slack-bot
* https://github.com/usubram/slack-bot
*
* Copyright (c) 2017 Umashankar Subramanian
* Licensed under the MIT license.
*/

'use strict';

const _ = require('lodash');
const apiRequest = require('./api-request');

/**
* Function to make get users request.
*
* @param {object} options http request options.
* @return {object} api response.
*/
module.exports.getUsersList = function (options) {
  const presence = _.get(options, 'presence', 0);

  return apiRequest.fetch({
    agent: options.agent,
    path: '/api/users.list?' +
    'presence=' + presence + '&token=' + options.botToken,
  });
};
