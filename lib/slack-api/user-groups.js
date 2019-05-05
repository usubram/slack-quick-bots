'use strict';

const apiRequest = require('./api-request');

/**
* Function to make get users group request.
*
* @param {object} options http request options.
* @return {object} api response.
*/
const getUserGroupsList = function (options) {
  return apiRequest.fetch({
    agent: options.agent,
    path: '/api/usergroups.list?include_users=true&token=' + options.botToken,
  });
};

module.exports = {
  getUserGroupsList,
};
