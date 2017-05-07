/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2017 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const apiRequest = require('./api-request');

module.exports.getUserGroupsList = function (options) {

  return apiRequest.fetch({
    agent: options.agent,
    path: '/api/usergroups.list?include_users=true&token=' + options.botToken
  });
};
