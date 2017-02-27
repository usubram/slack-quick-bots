/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2017 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const EventEmitter = require('events').EventEmitter;

const externals = {};

externals.BotInterface = class extends EventEmitter {
  constructor (options, eventEmitter) {
    super();

    this.options = options;
    this.eventEmitter = eventEmitter;
  }

  injectMessage (messageObj) {
    this.eventEmitter.emit('injectMessage', messageObj);
  }

  shutdown () {
    this.eventEmitter.emit('shutdown');
  }

  restart () {
    this.eventEmitter.emit('restart');
  }

  start () {
    this.eventEmitter.emit('start');
  }

  close () {
    this.eventEmitter.emit('close');
  }

  getBotName () {
    return this.options.getBotName();
  }

  getId () {
    return this.options.getId();
  }
};

module.exports = externals.BotInterface;
