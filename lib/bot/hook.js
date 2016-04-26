/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const _ = require('lodash');
const uuid = require('uuid');
const path = require('path');
const url = require('url');

const internals = {};

const externals = {};

exports = module.exports = externals.Hook = function (botId, server) {
  this.botId = botId;
  this.server = server;
  this.purpose = {};
};

externals.Hook.prototype.generateHook = function (purposeId) {
  this.purpose[purposeId] = internals.generateHookId();
  return this.purpose[purposeId];
};

externals.Hook.prototype.getHookPurpose = function (purposeId) {
  if (!this.server) {
    return;
  }
  if (!this.purpose[purposeId] || !this.purpose[purposeId].id) {
    this.purpose[purposeId] = this.purpose[purposeId] || {};
    this.purpose[purposeId].id = internals.generateHookId();
  }
  this.purpose[purposeId].url = internals.getHookUrl(this, this.purpose[purposeId], this.server);
  return this.purpose[purposeId];
};

internals.generateHookId = function () {
  return uuid.v4();
};

internals.getHookUrl = function (context, purpose, server) {
  var urlObj = {};
  if (server.address().address == '::' || server.address().address == '127.0.0.1') {
    urlObj.hostname = '0.0.0.0';
    urlObj.port = server.address().port;
    urlObj.protocol = 'http';
  } else {
    urlObj.host = server.address().address;
    urlObj.port = server.address().port;
    urlObj.protocol = server.address().protocol || 'http';
  }
  urlObj.pathname = path.join('hook', context.botId, purpose.id);
  return url.format(urlObj, false);
};
