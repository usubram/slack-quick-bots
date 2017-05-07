/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2017 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const apiRequest = require('./api-request');

module.exports.getUsersList = function (options) {

  return apiRequest.fetch({
    agent: options.agent,
    path: '/api/users.list?token=' + options.botToken
  });
};
