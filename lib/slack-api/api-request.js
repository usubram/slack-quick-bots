'use strict';

import * as lodash from 'lodash-es';
import { request } from 'https';
import logger from '../utils/logger.js';

const { extend, get, nth, split, clone, partial } = lodash;

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
      const httpOptions = extend(
        {
          host: 'slack.com',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          rejectUnauthorized: false,
        },
        options
      );

      const req = request(httpOptions, function (response) {
        let responseStr = '';

        response.on('data', function (chunk) {
          responseStr += chunk;
        });

        response.on('end', function () {
          let slackResponse = {};
          let errorRes = '';

          try {
            slackResponse = JSON.parse(responseStr);
          } catch (err) {
            logger.error('Slack response corrupted ', responseStr);
            slackResponse.error = 'invalid_slack_response';
          }

          errorRes = get(slackResponse, 'error');

          if (errorRes === 'invalid_auth' || errorRes === 'not_authed') {
            logger.info('Invalid auth token. Unable to connect');
            slackResponse.error = errorRes;

            return onReject(slackResponse);
          } else if (errorRes) {
            slackResponse.error = get(slackResponse, 'error');
            logger.info('Something wrong ', slackResponse.error);
            logger.debug('Something wrong with request for ', httpOptions);

            return onReject(slackResponse);
          } else {
            logger.info(
              'Api call returned success for ',
              nth(split(httpOptions.path, '?', 1), 0),
              offset
            );
            logger.debug('Api call response success ', slackResponse);

            return onFulfill(slackResponse);
          }
        });
      }).on('error', function (err) {
        logger.info('Unknown error on connecting to slack ', err);
        onReject({
          error: 'unkown_error',
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
    const apiOptions = clone(options);

    return fetch(apiOptions, offset)
      .then((response) => {
        offset = get(response, 'offset');
        store = handler(response, store);

        if (get(response, 'response_metadata.next_cursor')) {
          return timedRetryHandler(
            initiateRequest,
            offset,
            onFulfill,
            onReject
          );
        }

        return onFulfill(store);
      })
      .catch((error) => {
        if (error === 'invalid_auth') {
          return onReject(store);
        }

        logger.info(
          'Unexpected failure with slack api, retrying due to ',
          error
        );
        return timedRetryHandler(initiateRequest, offset, onFulfill, onReject);
      });
  };

  const timedRetryHandler = function (initiateRequest, offset, callback) {
    return setTimeout(
      (function (offset) {
        return function () {
          return initiateRequest(offset, callback);
        };
      })(offset),
      callInterval
    );
  };

  return Promise.resolve({
    then: partial((onFulfill, onReject) => {
      return initiateRequest(offset, onFulfill, onReject);
    }),
  });
};

/**
 * Function to make slack api post request.
 *
 * @param {object} options http request options.
 * @param {string} data api to post data.
 *
 * @return {object} api response.
 */
const post = function (options, data) {
  return Promise.resolve({
    then: (onFulfill, onReject) => {
      const httpOptions = extend(
        {
          host: 'slack.com',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + options.botToken,
          },
          rejectUnauthorized: false,
        },
        options
      );

      const req = request(httpOptions, function (response) {
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

          error = get(slackResponse, 'error');

          if (error === 'invalid_auth' || error === 'not_authed') {
            logger.info('Invalid auth token. Unable to connect');
            slackResponse.error = error;

            return onReject(slackResponse);
          } else if (error) {
            slackResponse.error = get(slackResponse, 'error');
            logger.info('Something wrong ', slackResponse.error);
            logger.debug('Something wrong with request for ', httpOptions);

            return onReject(slackResponse);
          } else {
            logger.debug('Api call response success ', slackResponse);

            return onFulfill(slackResponse);
          }
        });
      }).on('error', function (err) {
        logger.info('Unknown error on connecting to slack ', err);
        onReject({
          error: 'unkown_error',
        });
      });
      req.write(JSON.stringify(data));
      req.end();
    },
  });
};

export default {
  fetch,
  fetchBatchWithRetry,
  post,
};
