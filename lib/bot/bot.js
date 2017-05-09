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
const path = require('path');

const root = '..';
const handlebars = require('handlebars');
const logger = require(path.join(root, 'utils/logger'));
const BotInterface = require(path.join(root, 'bot/bot-interface'));
const Connector = require(path.join(root, 'bot/connector'));
const CommandFactory = require(path.join(root, 'command/command-factory'));
const EventEmitter = require('events').EventEmitter;
const Hook = require(path.join(root, 'bot/hook'));
const HttpsProxyAgent = require('https-proxy-agent');
const MockConnector = require(path.join(root, 'bot/mock-connector'));
const messageParser = require(path.join(root, 'command/message'));
const storage = require(path.join(root, 'storage/storage'));
const responseHandler = require(path.join(root, 'bot/response-handler'));
const channelsApi = require(path.join(root, 'slack-api/channels'));
const usersApi = require(path.join(root, 'slack-api/users'));
const userGroupsApi = require(path.join(root, 'slack-api/user-groups'));
const url = require('url');

const internals = {};
const externals = {};

externals.Bot = class {
  constructor (bot) {
    this.config = Object.assign({}, bot);
    this.ws = {};
    this.hook = {};
    this.eventEmitter = new EventEmitter();
    this.interfaceEventEmitter = new EventEmitter();
    this.botMessageParser = messageParser.parse(
      _.map(_.keys(_.get(this.config, 'botCommand')), _.toUpper));

    this.setupEvents();
    this.setupIntefaceEvents();
    handlebars.registerHelper(this.registerHandlebarsHelpers());
  }

  init () {
    if (_.get(this.config, 'mock')) {
      logger.debug('Connecting for bot in mock');
      this.connectionManager = new MockConnector(this.config.botToken, {
        socketEventEmitter: this.eventEmitter,
        mock: _.get(this.config, 'mock')
      });
    } else {
      logger.debug('Setting up connection for bots');
      this.connectionManager = new Connector(this.config.botToken, {
        httpAgent: this.getHttpAgent(),
        socketAgent: this.getSocketAgent(),
        socketEventEmitter: this.eventEmitter
      });
    }

    this.getAllTeamData().then((values) => {
      this.getSlackData()['channels'] = _.get(values, '0.channels');
      this.getSlackData()['members'] = _.get(values, '1.members');

      return this.connectionManager.connect();
    }).catch((error) => {
      logger.error('Failed operation with ', error);
    });

    this.commandFactory = this.loadCommands();

    return this.botInterface;
  }

  setupEvents () {
    this.eventEmitter.on('close', () => {
      this.botInterface.emit('close');
    }).on('connect', () => {
      this.loadSavedEvents();
    }).on('reconnect', () => {
      this.reconnect();
    }).on('shutdown', () => {
      this.botInterface.emit('shutdown');
    }).on('start', () => {
      this.botInterface.emit('start');
    }).on('ping', (args) => {
      this.dispatchMessage.apply(this, args);
    }).on('message', (args) => {
      this.handleMessage.apply(this, args);
    }).on('channel', (args) => {
      this.handleChannelEvents.apply(this, args);
    }).on('user', (args) => {
      this.handleUserEvents.apply(this, args);
    }).on('team', (args) => {
      this.handleTeamEvents.apply(this, args);
    }).on('presence', (args) => {
      this.handlePresenceEvents.apply(this, args);
    });
  }

  setupIntefaceEvents () {
    this.interfaceEventEmitter.on('injectMessage', (message) => {
      this.injectMessage(message);
    });

    this.interfaceEventEmitter.on('shutdown', () => {
      this.shutdown();
    });

    this.interfaceEventEmitter.on('restart', () => {
      this.close();
    });

    this.interfaceEventEmitter.on('close', () => {
      this.close();
    });

    this.interfaceEventEmitter.on('start', () => {
      this.start();
    });

    this.botInterface = new BotInterface({
      getBotName: () => {
        return this.getBotName();
      },
      getId: () => {
        return this.getId();
      }
    }, this.interfaceEventEmitter);
  }

  handleMessage (message) {
    var parsedMessage = this.botMessageParser({
      id: this.getId(),
      name: this.getBotName()
    }, message);

    if (this.config.blockDirectMessage && !responseHandler.isPublicMessage(message)) {
      logger.info('processed message ', parsedMessage);
      return this.handleBotMessages(parsedMessage);
    }

    if (responseHandler.isDirectMessage(message) ||
      _.toUpper(this.getBotName()) === parsedMessage.message.commandPrefix ||
      _.toUpper(this.getId()) === parsedMessage.message.commandPrefix) {

      logger.info('processed message ', parsedMessage);

      return this.commandFactory.handleMessage(parsedMessage).catch((err) => {
        return this.handleErrorMessage(this.getBotName(), err);
      });
    }
  }

  handleChannelEvents (message) {
    switch (message.type) {
      case 'channel_rename':
        logger.debug('Handling channel_rename event ', message);
        internals.renameChannel(this.getSlackData()['channels'], message);
        break;
      case 'channel_created':
        logger.debug('Handling channel_created event ', message);
        internals.channelCreated(this.getSlackData()['channels'], message);
        break;
      case 'channel_deleted':
        logger.debug('Handling channel_deleted event ', message);
        internals.channelDeleted(this.getSlackData()['channels'], message);
        break;
    }

  }

  handleUserEvents (message) {
    switch (message.type) {
      case 'user_change':
        logger.debug('Handling user_change event ', message);
        internals.userChange(this.getSlackData()['members'], message);
        break;
    }
  }

  handleTeamEvents (message) {
    switch (message.type) {
      case 'team_join':
        logger.debug('Handling team_join event ', message);
        internals.teamJoin(this.getSlackData()['members'], message);
        break;
    }
  }

  handlePresenceEvents (message) {
    switch (message.type) {
      case 'presence_change':
        logger.debug('Handling presence_change event ', message);
        internals.presenceChange(this.getSlackData()['members'], message);
        break;
    }
  }

  loadCommands () {
    return new CommandFactory({
      getBotConfig: () => {
        return this.config;
      },
      getSlackData: () => {
        return this.getSlackData();
      },
      getHttpAgent: () => {
        return this.getHttpAgent();
      },
      getHook: () => {
        return this.hook;
      },
      getEventStore: () => {
        return _.get(this.eventStore, this.getBotName());
      },
      messageHandler: (options, callback) => {
        this.dispatchMessage(options, callback);
      }
    });
  }

  loadSavedEvents () {
    if (this.eventStore) {
      this.botInterface.emit('connect');
    } else {
      storage.getEvents(['events', 'schedule']).then((events) => {
        this.eventStore = events;
        this.commandFactory.loadCommands();
        this.botInterface.emit('connect');
      }).catch((err) => {
        logger.error('Error loading saved event %j', err);
        this.commandFactory.loadCommands();
        this.botInterface.emit('connect');
      });

      this.hook = this.server ? new Hook(this.getId(), this.server) : undefined;
    }
  }

  handleHookRequest (purposeId, data, response) {
    this.commandFactory.handleHook(purposeId, data, response).then((cmdResponse) => {
      this.dispatchMessage(cmdResponse);
      response.end('{ "response": "ok" }');
    }).catch((errResponse) => {
      response.end(JSON.stringify(errResponse));
    });
  }

  dispatchMessage (options, callback) {
    callback = _.isFunction(callback) ? callback : undefined;
    options.channels = _.isArray(options.channels) ?
      options.channels : [options.channels || options.channel];

    _.forEach(options.channels, (channel) => {

      let message = {
        'id': new Date().getTime().toString(),
        'type': options.type || 'message',
        'channel': channel,
        'text': '' + options.message
      };

      try {
        let messageStr = JSON.stringify(message,
          internals.jsonReplacer).replace(/\n/g, '\n');

        this.connectionManager.socket.sendMessage(messageStr, callback);

      } catch (err) {
        logger.error('Error sending message ', err);
      }

      this.handleMessageEvent(message);
    });
  }

  handleErrorMessage (botName, context) {
    let renderedData = responseHandler.generateErrorTemplate(botName,
      this.config.botCommand, context);
    this.dispatchMessage({
      channels: context.parsedMessage.channel,
      message: renderedData
    });

    return Promise.resolve(renderedData);
  }

  handleBotMessages (parsedMessage) {
    var renderedData = responseHandler.generateBotResponseTemplate({
      /* jshint ignore:start */
      bot_direct_message_error: true
      /* jshint ignore:end */
    });

    this.dispatchMessage({
      channels: parsedMessage.channel,
      message: renderedData
    });

    return Promise.resolve(renderedData);
  }

  close () {
    this.connectionManager.close();
  }

  shutdown () {
    this.connectionManager.shutdown();
  }

  start () {
    this.connectionManager.connect().catch((err) => {
      logger.error('Unable to start the bot %j', err);
    });
  }

  reconnect () {
    this.connectionManager.reconnect();
  }

  getId () {
    var socket = _.get(this, 'connectionManager.socket');
    return socket ? socket.getId() : undefined;
  }

  getBotName () {
    var socket = _.get(this, 'connectionManager.socket');
    return socket ? socket.getBotName() : undefined;
  }

  getSlackData () {
    var socket = _.get(this, 'connectionManager.socket');
    return socket ? socket.getSlackData() : {};
  }

  injectMessage (messageObj) {
    let message = _.merge({}, {
      'id': '',
      'type': 'message',
      'channel': 'C1234567',
      'text': ' '
    }, messageObj);

    return this.handleMessage(message).catch((err) => {
      logger.error('Unable to inject message %j', err);
    });
  }

  handleMessageEvent (message) {
    if (message.type === 'message') {
      let callbackMessage = {
        bot: this.getBotName(),
        message: message.text,
        completeMessage: JSON.stringify(message,
          internals.jsonReplacer).replace(/\n/g, '\n')
      };

      this.botInterface.emit('message', callbackMessage);
    }
  }

  getSocketAgent () {
    if (!this.socketAgent && this.proxy && this.proxy.url) {
      let opts = url.parse(this.proxy.url);
      opts.secureEndpoint = opts.protocol ? opts.protocol == 'wss:' : false;
      this.socketAgent = new HttpsProxyAgent(opts);
    }

    return this.socketAgent;
  }

  getHttpAgent () {
    if (!this.httpAgent && this.proxy && this.proxy.url) {
      let opts = url.parse(this.proxy.url);
      opts.secureEndpoint = opts.protocol ? opts.protocol == 'https:' : false;
      this.httpAgent = new HttpsProxyAgent(opts);
    }

    return this.httpAgent;
  }

  fetchTeamUsers () {
    logger.info('Fetching user list from slack');

    return usersApi.getUsersList({
      botToken: this.config.botToken
    });
  }

  fetchTeamChannels () {
    logger.info('Fetching channel list from slack');

    return channelsApi.getChannelsList({
      botToken: this.config.botToken
    });
  }

  fetchTeamUserGroups () {
    logger.info('Fetching user list from slack');

    return userGroupsApi.getUserGroupsList({
      botToken: this.config.botToken
    });
  }

  getAllTeamData () {
    return Promise.all([
      this.fetchTeamChannels(),
      this.fetchTeamUsers()
    ]);
  }

  registerHandlebarsHelpers () {
    return {
      idFromEmail: (context) => {
        if (context) {
          return this.getSlackIdFromEmail(context);
        }
      },
      presenceFromEmail: (context) => {
        if (context) {
          return this.getPresenceFromEmail(context);
        }
      }
    };
  }

  getSlackIdFromEmail (emailId) {
    const uEmailId = _.toUpper(emailId);
    const user = _.find(this.getSlackData().members, (member) => {
      return _.toUpper(_.get(member, 'profile.email')) === uEmailId;
    });

    if (user && user.id) {
      return user.id;
    }

    return;
  }

  getPresenceFromEmail (emailId) {
    const uEmailId = _.toUpper(emailId);
    const user = _.find(this.getSlackData().members, (member) => {
      return _.toUpper(_.get(member, 'profile.email')) === uEmailId;
    });

    if (user && user.presence) {
      return user.presence;
    }

    return;
  }
};

internals.jsonReplacer = function (key, value) {
  if (value && key === 'text') {
    return value.replace(/\n|\t/g, '').replace(/\\n/g, '\n');
  }

  return value;
};

internals.renameChannel = function (channels, message) {
  const channel = _.find(channels, { id: message.channel.id });

  if (channel) {
    channel.name = message.channel.name;
    logger.debug('Channel rename ', channel.name);
  }
};

internals.channelCreated = function (channels, message) {
  channels.push(message.channel);
};

internals.channelDeleted = function (channels, message) {
  const deleteChannel = _.remove(channels, (channel) => {
    return channel.id == message.channel;
  });

  if ((deleteChannel || []).length > 0) {
    logger.debug('Channel delete updated for ', message.channel);
  }
};

internals.userChange = function (members, message) {
  let user = _.find(members, { id: message.user.id });

  if (user) {
    user = message.user;
    logger.debug('Updated profile for ', user.name);
  }
};

internals.teamJoin = function (members, message) {
  if (members) {
    logger.debug('Added user ', message.user.id);
    members.push(message.user);
  }
};

internals.presenceChange = function (members, message) {
  let user = _.find(members, { id: message.user });

  if (user) {
    user.presence = message.presence;
    logger.debug('Updated profile for ', user.name);
  }
};

module.exports = externals.Bot;
