'use strict';

const root = '..';
const _ = require('lodash');
const http = require('https');
const path = require('path');
const logger = require(path.join(root, 'utils/logger'));

/**
* Function to make slack api get request.
*
* @param {object} options http request options.
* @param {string} offset api pagination offset.
*
* @return {object} api response.
*/
const fetch = function (options, offset) {
  if (offset) {
    options.path += '&offset=' + offset;
  }

  return Promise.resolve({
    then: (onFulfill, onReject) => {
      const httpOptions = _.extend({
        host: 'slack.com',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        rejectUnauthorized: false,
      }, options);

      const req = http.request(httpOptions, function (response) {
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
              _.nth(_.split(httpOptions.path, '?', 1), 0), offset);
            logger.debug('Api call response success ', slackResponse);

            return onFulfill(slackResponse);
          }
        });
      }).on('error', function (err) {
        logger.info('Unknown error on connecting to slack ', err);
        onReject({
          'error': 'unkown_error',
        });
      });
      req.end();
    },
  });
};

const fetchBatchWithRetry = function (options, interval, handler) {
  const callInterval = Number(interval) ? interval : 10000;
  let store;
  let offset;

  const initiateRequest = (offset, onFulfill, onReject) => {
    const apiOptions = _.clone(options);

    return fetch(apiOptions, offset).then((response) => {
      offset = _.get(response, 'offset');
      store = handler(response, store);

      if (_.get(response, 'response_metadata.next_cursor')) {
        return timedRetryHandler(initiateRequest, offset, onFulfill, onReject);
      }

      return onFulfill(store);
    }).catch((error) => {
      if (error === 'invalid_auth') {
        return onReject(store);
      }

      logger.info('Unexpected failure with slack api, retrying due to ', error);
      return timedRetryHandler(initiateRequest, offset, onFulfill, onReject);
    });
  };

  const timedRetryHandler = function (initiateRequest, offset, callback) {
    return setTimeout((function (offset) {
      return function () {
        return initiateRequest(offset, callback);
      };
    })(offset), callInterval);
  };

  return Promise.resolve({
    then: _.partial((onFulfill, onReject) => {
      return initiateRequest(offset, onFulfill, onReject);
    }),
  });
};

module.exports = {
  fetch,
  fetchBatchWithRetry,
};
