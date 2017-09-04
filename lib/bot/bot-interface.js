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

/**
*
* Creates a new Bot Interface.
*
*/
externals.BotInterface = class extends EventEmitter {

  /**
  * Creates a new Bot Interface.
  * @param {object} options Options object.
  * @param {function} options.getBotName Returns bot name.
  * @param {function} options.getId Returns bot id.
  * @param {function} eventEmitter Private event emitter.
  *
  * @class
  */
  constructor (options, eventEmitter) {
    super();

    this.options = options;
    this.eventEmitter = eventEmitter;
  }

  /**
  * Inject message to bot in mock mode only.
  * @example
  * {
  *   id: uuid.v4(),
  *   type: 'message',
  *   channel: 'D0GL06JD7',
  *   user: 'U0GG92T45',
  *   text: 'ping 1',
  *   team: 'T0GGDKVDE'
  * }
  * @param {object} messageObj Format to send message.
  */
  injectMessage (messageObj) {
    this.eventEmitter.emit('injectMessage', messageObj);
  }

  /**
  * Inject message to bot Workly only during mock mode.
  * @example
  * {
  *   id: uuid.v4(),
  *   type: 'message',
  *   channel: 'D0GL06JD7',
  *   user: 'U0GG92T45',
  *   text: 'ping 1',
  *   team: 'T0GGDKVDE'
  * }
  */
  shutdown () {
    this.eventEmitter.emit('shutdown');
  }

  /**
  * Function to restart the bot.
  */
  restart () {
    this.eventEmitter.emit('restart');
  }

  /**
  * Function to start the bot.
  */
  start () {
    this.eventEmitter.emit('start');
  }

  /**
  * Function for bot to close connection with slack.
  */
  close () {
    this.eventEmitter.emit('close');
  }

  /**
  * Function to get bot name.
  * @example
  * // firstbot
  *
  * @return {string} Name of the bot
  */
  getBotName () {
    return this.options.getBotName();
  }

  /**
  * Function to get bot id.
  * @example
  * // U1234567
  *
  * @return {string} Id of the bot
  */
  getId () {
    return this.options.getId();
  }

  /**
  * Function to get slack user profile by email or slack id or slack username.
  * @param {object} identifiers Attribute to slack user profile lookup.
  * @example
  * {
  *   email: name@email.com,
  *   slackId: 'U1234567',
  *   userName: 'slackUserName'
  * }
  * @return {object} slack user profle https://api.slack.com/methods/users.info
  */
  getUserProfile (identifiers) {
    return this.options.getUserProfile(identifiers);
  }
};

module.exports = externals.BotInterface;
