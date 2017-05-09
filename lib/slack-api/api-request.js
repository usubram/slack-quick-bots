/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2017 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const root = '..';
const _ = require('lodash');
const http = require('https');
const path = require('path');
const logger = require(path.join(root, 'utils/logger'));

module.exports.fetch = function (options) {
  return Promise.resolve({
    then: (onFulfill, onReject) => {

      const httpOptions = _.extend({
        host: 'slack.com',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        rejectUnauthorized: false
      }, options);

      let req = http.request(httpOptions, function (response) {

        let responseStr = '';

        response.on('data', function (chunk) {
          responseStr += chunk;
        });

        response.on('end', function () {
          let slackResponse = {};
          let error = '';

          try {
            slackResponse = JSON.parse(responseStr);
          } catch (err) {
            logger.error('Slack response corrupted ', responseStr);
            slackResponse.error = 'invalid_slack_response';
          }

          error = _.get(slackResponse, 'error');

          if (error === 'invalid_auth' || error === 'not_authed') {
            logger.info('Invalid auth token. Unable to connect');
            slackResponse.error = error;

            return onReject(slackResponse);
          } else if (error) {
            slackResponse.error = _.get(slackResponse, 'error');
            logger.info('Something wrong ', slackResponse.error);
            logger.debug('Something wrong with request for ', httpOptions);

            return onReject(slackResponse);
          } else {
            logger.info('Api call returned success for ',
              _.nth(_.split(httpOptions.path, '?', 1), 0));
            logger.debug('Api call response success ', slackResponse);

            return onFulfill(slackResponse);
          }

        });
      }).on('error', function (err) {
        logger.info('Unknown error on connecting to slack ', err);
        onReject({ 'error': 'unkown_error'});
      });

      req.end();
    }
  });
};
