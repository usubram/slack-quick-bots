'use strict';

// Load modules
import { v4 } from 'uuid';
import { join } from 'path';
import { format } from 'url';

/**
 *
 * Represents the state and events for custom webhook.
 *
 */
const Hook = class {
  /**
   * Creates a new Hook instance.
   * @param {string} botId bot id.
   * @param {object} server http server instance.
   *
   * @class
   */
  constructor(botId, server) {
    this.botId = botId;
    this.server = server;
    this.purpose = {};
  }

  /**
   * Function to generate hook.
   * @param {string} purposeId unique uuid for hook identifier.
   *
   * @return {Object} Hook details for the given purpose id.
   */
  generateHook(purposeId) {
    this.purpose[purposeId] = generateHookId();

    return this.purpose[purposeId];
  }

  /**
   * Function to get generated hook.
   * @param {string} purposeId unique uuid for hook identifier.
   *
   * @return {Object} Hook details for the input purpose id.
   */
  getHookPurpose(purposeId) {
    if (!this.server) {
      return;
    }

    if (!this.purpose[purposeId] || !this.purpose[purposeId].id) {
      this.purpose[purposeId] = this.purpose[purposeId] || {};
      this.purpose[purposeId].id = generateHookId();
    }

    this.purpose[purposeId].url = getHookUrl(
      this,
      this.purpose[purposeId],
      this.server
    );

    return this.purpose[purposeId];
  }
};

/**
 * Function to get uuid for hook.
 *
 * @return {string} unique uuid.
 */
const generateHookId = function () {
  return v4();
};

/**
 * Function to get uuid for hook.
 *
 * @param {object} context hook context.
 * @param {object} purpose hook instance.
 * @param {object} server http server instance.
 *
 * @return {object} standard url object.
 */
const getHookUrl = function (context, purpose, server) {
  const urlObj = {};

  if (
    server.address().address === '::' ||
    server.address().address === '127.0.0.1'
  ) {
    urlObj.hostname = '0.0.0.0';
  } else {
    urlObj.hostname = server.address().address;
  }

  urlObj.port = server.address().port;
  urlObj.protocol = server.address().protocol || 'http';
  urlObj.pathname = join('hook', context.botId, purpose.id);

  return format(urlObj, false);
};

export { Hook };
