/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2017 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

var externals = {};

externals.BotInterface = function (_EventEmitter) {
  _inherits(_class, _EventEmitter);

  function _class(options, eventEmitter) {
    _classCallCheck(this, _class);

    var _this = _possibleConstructorReturn(this, (_class.__proto__ || Object.getPrototypeOf(_class)).call(this));

    _this.options = options;
    _this.eventEmitter = eventEmitter;
    return _this;
  }

  _createClass(_class, [{
    key: 'injectMessage',
    value: function injectMessage(messageObj) {
      this.eventEmitter.emit('injectMessage', messageObj);
    }
  }, {
    key: 'shutdown',
    value: function shutdown() {
      this.eventEmitter.emit('shutdown');
    }
  }, {
    key: 'restart',
    value: function restart() {
      this.eventEmitter.emit('restart');
    }
  }, {
    key: 'start',
    value: function start() {
      this.eventEmitter.emit('start');
    }
  }, {
    key: 'close',
    value: function close() {
      this.eventEmitter.emit('close');
    }
  }, {
    key: 'getBotName',
    value: function getBotName() {
      return this.options.getBotName();
    }
  }, {
    key: 'getId',
    value: function getId() {
      return this.options.getId();
    }
  }]);

  return _class;
}(EventEmitter);

module.exports = externals.BotInterface;