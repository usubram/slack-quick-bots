/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var root = '..';

var _ = require('lodash');
var path = require('path');

var Connector = require(path.join(root, 'bot/connector'));

var externals = {};
var localSocketServer = 'ws://0.0.0.0:4080';

externals.MockConnector = function (_Connector) {
  _inherits(_class, _Connector);

  function _class(token, options) {
    _classCallCheck(this, _class);

    return _possibleConstructorReturn(this, (_class.__proto__ || Object.getPrototypeOf(_class)).call(this, token, options));
  }

  _createClass(_class, [{
    key: 'makeRequest',
    value: function makeRequest() {
      this.retryAttempt = this.retryAttempt || 0;

      this.retryAttempt++;

      if (this.retryAttempt >= _.get(this, 'options.mock.retryAttempt', 0)) {
        if (this.options.mock.error) {
          return Promise.reject({
            error: this.options.mock.error
          });
        }

        return Promise.resolve(_.extend(this.options.mock, {
          url: localSocketServer
        }));
      } else {
        return Promise.reject({
          error: 'unkown error'
        });
      }
    }
  }]);

  return _class;
}(Connector);

module.exports = externals.MockConnector;