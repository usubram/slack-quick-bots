'use strict';
import * as lodash from 'lodash-es';

import { Connector } from './connector.js';
import { getPort } from './socket-server.js';

const localSocketServer = 'ws://0.0.0.0';
const { get, extend } = lodash;
/**
 *
 * Represents the state and events of a mock connector.
 *
 */
const MockConnector = class extends Connector {
  /**
   * Creates a new mock connector instance.
   *
   * @param {string} token Bot token.
   * @param {object} options Connection options.
   * @param {function} options.httpAgent http proxy agent.
   * @param {function} options.socketAgent socket proxy agent.
   * @param {object} options.socketEventEmitter event emitter.
   * @class
   */
  constructor(token, options) {
    super(token, options);
  }

  /**
   * Function to mock slack rtm request.
   *
   * @return {object} Promise resolves to success or failure.
   */
  makeRequest() {
    this.retryAttempt = this.retryAttempt || 0;

    this.retryAttempt++;

    if (this.retryAttempt >= get(this, 'options.mock.retryAttempt', 0)) {
      if (this.options.mock.error) {
        return Promise.reject({
          error: this.options.mock.error,
        });
      }

      return Promise.resolve(
        extend(this.options.mock, {
          url: localSocketServer + ':' + getPort(),
        })
      );
    } else {
      return Promise.reject({
        error: 'unkown error',
      });
    }
  }
};

export { MockConnector };
