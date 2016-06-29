/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var uuid = require('uuid');
var path = require('path');
var url = require('url');

var externals = {};
var internals = {};

externals.Hook = function () {
  function _class(botId, server) {
    _classCallCheck(this, _class);

    this.botId = botId;
    this.server = server;
    this.purpose = {};
  }

  _createClass(_class, [{
    key: 'generateHook',
    value: function generateHook(purposeId) {
      this.purpose[purposeId] = internals.generateHookId();
      return this.purpose[purposeId];
    }
  }, {
    key: 'getHookPurpose',
    value: function getHookPurpose(purposeId) {
      if (!this.server) {
        return;
      }
      if (!this.purpose[purposeId] || !this.purpose[purposeId].id) {
        this.purpose[purposeId] = this.purpose[purposeId] || {};
        this.purpose[purposeId].id = internals.generateHookId();
      }
      this.purpose[purposeId].url = internals.getHookUrl(this, this.purpose[purposeId], this.server);
      return this.purpose[purposeId];
    }
  }]);

  return _class;
}();

internals.generateHookId = function () {
  return uuid.v4();
};

internals.getHookUrl = function (context, purpose, server) {
  var urlObj = {};
  if (server.address().address === '::' || server.address().address === '127.0.0.1') {
    urlObj.hostname = '0.0.0.0';
  } else {
    urlObj.hostname = server.address().address;
  }
  urlObj.port = server.address().port;
  urlObj.protocol = server.address().protocol || 'http';
  urlObj.pathname = path.join('hook', context.botId, purpose.id);
  return url.format(urlObj, false);
};

module.exports = externals.Hook;