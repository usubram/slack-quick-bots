'use strict';

// Load modules
import * as lodash from 'lodash-es';
import { parse } from 'url';

import Handlebars from 'handlebars';
import * as moment from 'moment';
import logger from '../utils/logger.js';
import { BotInterface } from './bot-interface.js';
import { Connector } from './connector.js';
import { CommandFactory } from '../command/command-factory.js';
import { EventEmitter } from 'events';
import { EventStore } from './event-store.js';
import { Hook } from './hook.js';
import HttpsProxyAgent from 'https-proxy-agent';
import { MockConnector } from './mock-connector.js';
import { parse as _parse } from '../command/message.js';
import { Storage } from '../storage/storage.js';
import {
  isDirectMessage,
  isPrivateMessage,
  generateErrorTemplate,
  generateBotResponseTemplate,
} from './response-handler.js';
import { getChannelsList } from '../slack-api/channels.js';
import { getUsersList } from '../slack-api/users.js';
import { getUserGroupsList } from '../slack-api/user-groups.js';

const {
  map,
  get,
  toUpper,
  nth,
  reduce,
  isFunction,
  isArray,
  forEach,
  isBoolean,
  merge,
  extend,
  toLower,
  endsWith,
  replace,
  compact,
  repeat,
  split,
  find,
  remove,
} = lodash;
const { unix } = moment;
/**
 *
 * Represents the state and events of a bot.
 *
 */
const Bot = class {
  /**
   * Creates a new Bot instance.
   * @param {object} bot Normalize bot config from bots.js.
   * @class
   */
  constructor(bot) {
    this.config = Object.assign({}, bot);
    this.ws = {};
    this.hook = {};
    this.eventEmitter = new EventEmitter();
    this.interfaceEventEmitter = new EventEmitter();
    this.botMessageParser = _parse(
      map(get(this.config, 'botCommand'), (command, key) => {
        return {
          command: toUpper(key),
          alias: command.alias ? (command.alias || []).map(toUpper) : [],
        };
      })
    );

    this.setupEvents();
    this.setupIntefaceEvents();
    Handlebars.registerHelper(this.registerHandlebarsHelpers());
  }

  /**
   * Function to roll the ball.
   *
   * @return {Object} Promise object resolves to @link bot-interface.js
   */
  init() {
    if (get(this.config, 'mock')) {
      logger.debug('Connecting for bot in mock');
      this.connectionManager = new MockConnector(this.config.botToken, {
        socketEventEmitter: this.eventEmitter,
        mock: get(this.config, 'mock'),
      });

      this.connectionManager.connect();
    } else {
      logger.debug('Setting up connection for bots');
      this.connectionManager = new Connector(this.config.botToken, {
        httpAgent: this.getHttpAgent(),
        socketAgent: this.getSocketAgent(),
        socketEventEmitter: this.eventEmitter,
      });

      this.getAllTeamData(this.config.slackApi)
        .then((values) => {
          this.getSlackData()['channels'] = nth(values, 0);
          this.getSlackData()['members'] = nth(values, 1);

          return this.connectionManager.connect();
        })
        .catch((error) => {
          logger.error('Failed operation with ', error);

          return this.connectionManager.connect();
        })
        .catch(() => {
          logger.error('Exiting for one of the bots');
        });
    }

    this.commandFactory = this.loadCommands();

    return this.botInterface;
  }

  /**
   * Function to setup all public and private events for bot.
   */
  setupEvents() {
    this.eventEmitter
      .on('close', () => {
        this.botInterface.emit('close');
      })
      .on('connect', () => {
        this.loadSavedEvents();
      })
      .on('reconnect', () => {
        this.reconnect();
      })
      .on('shutdown', () => {
        this.botInterface.emit('shutdown');
      })
      .on('start', () => {
        this.botInterface.emit('start');
      })
      .on('ping', (args) => {
        this.dispatchMessage(...args);
      })
      .on('message', (args) => {
        this.handleMessage(...args);
      })
      .on('channel', (args) => {
        this.handleChannelEvents(...args);
      })
      .on('user', (args) => {
        this.handleUserEvents(...args);
      })
      .on('team', (args) => {
        this.handleTeamEvents(...args);
      })
      .on('presence', (args) => {
        this.handlePresenceEvents(...args);
      });
  }

  /**
   * Function to setup public events.
   */
  setupIntefaceEvents() {
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

    this.botInterface = new BotInterface(
      {
        getBotName: () => {
          return this.getBotName();
        },
        getId: () => {
          return this.getId();
        },
        getUserProfile: (identifiers, options) => {
          return this.getSlackUserProfile(identifiers, options);
        },
      },
      this.interfaceEventEmitter
    );
  }

  /**
   * Function to handle messages to bot.
   * @param {object} message Message returned @link command/message.js.
   *
   * @return {object} Promise object resolve to response message.
   */
  handleMessage(message) {
    if (this.config.repliesInThread) {
      message.thread_ts = message.ts;
    }

    const parsedMessage = this.botMessageParser(
      {
        id: this.getId(),
        eId: this.getEId(),
        name: this.getBotName(),
      },
      message
    );
    const isMessageForBot =
      toUpper(this.getBotName()) === parsedMessage.message.commandPrefix ||
      toUpper(this.getId()) === parsedMessage.message.commandPrefix ||
      toUpper(this.getEId()) === parsedMessage.message.commandPrefix;
    const isSelf =
      parsedMessage.user === toUpper(this.getId()) ||
      parsedMessage.user === toUpper(this.getEId());

    if (
      this.config.blockDirectMessage &&
      (isDirectMessage(message) ||
        (isPrivateMessage(message) && isMessageForBot))
    ) {
      logger.info('processed message ', parsedMessage);

      return this.handleBotMessages(
        parsedMessage,
        this.config.blockDirectMessage
      );
    }

    if (!isSelf && (isDirectMessage(message) || isMessageForBot)) {
      logger.info('processed message ', parsedMessage);

      return this.commandFactory.handleMessage(parsedMessage).catch((err) => {
        if (err.softReject) {
          return this.handleBotMessages(parsedMessage, err.blockDirectMessage);
        }

        return this.handleErrorMessage(this.getBotName(), err);
      });
    }

    return Promise.resolve();
  }

  /**
   * Function to handle channel event to update in memory slack data.
   * @param {object} message Message returned @link command/message.js.
   */
  handleChannelEvents(message) {
    switch (message.type) {
      case 'channel_rename':
        logger.debug('Handling channel_rename event ', message);
        renameChannel(this.getSlackData()['channels'], message);
        break;
      case 'channel_created':
        logger.debug('Handling channel_created event ', message);
        channelCreated(this.getSlackData()['channels'], message);
        break;
      case 'channel_deleted':
        logger.debug('Handling channel_deleted event ', message);
        channelDeleted(this.getSlackData()['channels'], message);
        break;
    }
  }

  /**
   * Function to handle user event to update in memory slack data.
   * @param {object} message Message returned @link command/message.js.
   */
  handleUserEvents(message) {
    switch (message.type) {
      case 'user_change':
        logger.debug('Handling user_change event ', message);
        userChange(this.getSlackData()['members'], message);
        break;
    }
  }

  /**
   * Function to handle team event to update in memory slack data.
   * @param {object} message Message returned @link command/message.js.
   */
  handleTeamEvents(message) {
    switch (message.type) {
      case 'team_join':
        logger.debug('Handling team_join event ', message);
        teamJoin(this.getSlackData()['members'], message);
        break;
    }
  }

  /**
   * Function to handle user presence event to update in memory slack data.
   * @param {object} message Message returned @link command/message.js.
   */
  handlePresenceEvents(message) {
    switch (message.type) {
      case 'presence_change':
        logger.debug('Handling presence_change event ', message);
        presenceChange(this.getSlackData()['members'], message);
        break;
    }
  }

  /**
   * Function to create command instance for bot commands.
   * @return {object} Instance of @link command/command-factory.js.
   */
  loadCommands() {
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
        return this.store;
      },
      messageHandler: (options, callback) => {
        this.dispatchMessage(options, callback);
      },
    });
  }

  /**
   * Function to load persisted events/schedules on bot restart.
   * @param {function} options.getBotName Returns bot name.
   */
  loadSavedEvents() {
    if (this.store) {
      this.botInterface.emit('connect');
    } else {
      Storage.getEvents(['events', 'schedule'])
        .then((events) => {
          this.store = new EventStore({
            eventStore: reduce(
              events,
              (result, value, key) => {
                result[key] = get(value, this.getBotName());

                return result;
              },
              {}
            ),
            botName: this.getBotName(),
          });

          this.commandFactory.loadCommands().then(() => {
            this.botInterface.emit('connect');
          });
        })
        .catch((err) => {
          logger.error('Error loading saved event %j', err);
          this.commandFactory.loadCommands().then(() => {
            this.botInterface.emit('connect');
          });
        });

      this.hook = this.server ? new Hook(this.getId(), this.server) : undefined;
    }
  }

  /**
   * Function to web handle hook request for the bot.
   * @param {string} purposeId Identifier for the hook request.
   * @param {object} data Input data to post to slack.
   * @param {object} response http response object.
   */
  handleHookRequest(purposeId, data, response) {
    this.commandFactory
      .handleHook(purposeId, data, response)
      .then((cmdResponse) => {
        this.dispatchMessage(cmdResponse);
        response.end('{ "response": "ok" }');
      })
      .catch((errResponse) => {
        response.end(JSON.stringify(errResponse));
      });
  }

  /**
   * Function to send RTM message to slack.
   * @param {object} options Contains message details.
   * @param {array} options.channels Channels to send the message.
   * @param {string} options.message Message to send to slack.
   * @param {string} options.type Type of message.
   * @param {function} callback Function called after socket message sent.
   *
   * @callback Function called after socket message sent.
   */
  dispatchMessage(options, callback) {
    callback = isFunction(callback) ? callback : undefined;
    options.channels = isArray(options.channels)
      ? options.channels
      : [options.channels || options.channel];

    forEach(options.channels, (channel) => {
      const message = {
        id: new Date().getTime().toString(),
        type: options.type || 'message',
        channel: channel,
        text: '' + options.message,
      };

      if (options.thread) {
        message.thread_ts = options.thread;
      }

      try {
        const messageStr = JSON.stringify(message, jsonReplacer).replace(
          /\n/g,
          '\n'
        );

        this.connectionManager.socket.sendMessage(messageStr, callback);
      } catch (err) {
        logger.error('Error sending message ', err);
      }

      this.handleMessageEvent(message);
    });
  }

  /**
   * Function to handle error message.
   * @param {string} botName Bot name to display in the message.
   * @param {object} context Channels to send the message.
   *
   * @return {object} Promise resolves the rendered error message.
   */
  handleErrorMessage(botName, context) {
    const renderedData = generateErrorTemplate(
      botName,
      this.config.botCommand,
      context
    );

    this.dispatchMessage({
      channels: context.parsedMessage.channel,
      thread: context.parsedMessage.thread_ts || context.parsedMessage.ts,
      message: renderedData,
    });

    return Promise.resolve(renderedData);
  }

  /**
   * Function to handle bot autonomous message.
   * @param {object} parsedMessage Message returned @link command/message.js.
   * @param {string/boolean} botDirectMessageError Custom message
   * for block direct message or boolean.
   *
   * @return {object} Promise resolves the rendered error message.
   */
  handleBotMessages(parsedMessage, botDirectMessageError) {
    let renderedMessage;
    try {
      if (!isBoolean(botDirectMessageError)) {
        const error = Handlebars.compile(botDirectMessageError)({
          user: `<@${parsedMessage.user}>`,
        });
        renderedMessage = botDirectMessageError ? error : '';
      }
    } catch (err) {
      logger.error('Error compiling blockDirectMessage ', err);
      renderedMessage = '';
    }

    const renderedData = generateBotResponseTemplate({
      botDirectMessageError: Boolean(botDirectMessageError),
      message: renderedMessage ? renderedMessage : false,
    });

    this.dispatchMessage({
      channels: parsedMessage.channel,
      message: renderedData,
      thread: parsedMessage.thread_ts || parsedMessage.ts,
    });

    return Promise.resolve(renderedData);
  }

  /**
   * Function to get bot enterprise id.
   *
   * @return {string} Bot id.
   */
  getEId() {
    const socket = get(this, 'connectionManager.socket');
    return socket ? socket.getEId() : undefined;
  }

  /**
   * Function to close bot socket connection. Bot will retry to reconnect.
   */
  close() {
    this.connectionManager.close();
  }

  /**
   * Function to shutdownb bot socket connection.
   * Bot will not retry to reconnect.
   */
  shutdown() {
    this.connectionManager.shutdown();
  }

  /**
   * Function to start the bot socket connection, when it is shutdown
   */
  start() {
    this.connectionManager.connect().catch((err) => {
      logger.error('Unable to start the bot %j', err);
    });
  }

  /**
   * Function to start the bot socket connection, when it is shutdown
   */
  reconnect() {
    this.connectionManager.reconnect();
  }

  /**
   * Function to get bot id.
   *
   * @return {string} Bot id.
   */
  getId() {
    const socket = get(this, 'connectionManager.socket');
    return socket ? socket.getId() : undefined;
  }

  /**
   * Function to get bot name.
   *
   * @return {string} Bot name.
   */
  getBotName() {
    const socket = get(this, 'connectionManager.socket');
    return socket ? socket.getBotName() : undefined;
  }

  /**
   * Function to get slack data in memory.
   *
   * @return {object} Slack data.
   */
  getSlackData() {
    const socket = get(this, 'connectionManager.socket');
    return socket ? socket.getSlackData() : {};
  }

  /**
   * Function to inject messages to bot in mock mode.
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
   * @param {object} messageObj Format to send message.
   * @return {object} Promise resolves to success/failure.
   */
  injectMessage(messageObj) {
    const message = merge(
      {},
      {
        id: '',
        type: 'message',
        channel: 'C1234567',
        text: ' ',
      },
      messageObj
    );

    return this.handleMessage(message).catch((err) => {
      logger.error('Unable to inject message %j', err);
    });
  }

  /**
   * Function to inject messages to bot in mock mode.
   * Inject message to bot Workly only during mock mode.
   * @example
   * {
   *   'id': new Date().getTime().toString(),
   *   'type': options.type || 'message',
   *   'channel': channel,
   *   'text': '' + options.message,
   * }
   * @param {object} message Format to send message.
   */
  handleMessageEvent(message) {
    if (message.type === 'message') {
      const callbackMessage = {
        bot: this.getBotName(),
        message: message.text,
        completeMessage: JSON.stringify(message, jsonReplacer).replace(
          /\n/g,
          '\n'
        ),
      };

      this.botInterface.emit('message', callbackMessage);
    }
  }

  /**
   * Function to get socket proxy agent if proxy exist.
   *
   * @return {object} socket agent.
   */
  getSocketAgent() {
    if (!this.socketAgent && this.proxy && this.proxy.url) {
      const opts = parse(this.proxy.url);
      opts.secureEndpoint = opts.protocol ? opts.protocol == 'wss:' : false;
      this.socketAgent = new HttpsProxyAgent(opts);
    }

    return this.socketAgent;
  }

  /**
   * Function to get http proxy agent if proxy exist.
   *
   * @return {object} http agent.
   */
  getHttpAgent() {
    if (!this.httpAgent && this.proxy && this.proxy.url) {
      const opts = parse(this.proxy.url);
      opts.secureEndpoint = opts.protocol ? opts.protocol == 'https:' : false;
      this.httpAgent = new HttpsProxyAgent(opts);
    }

    return this.httpAgent;
  }

  /**
   * Function to get users in the slack team.
   * @param {object} config Config for get users api.
   *
   * @return {array} List of slack users. Look at slack docs for user model.
   */
  fetchTeamUsers(config) {
    if (get(config, 'exclude', false)) {
      logger.info('Excluding user list call');
      return {};
    }

    logger.info('Fetching user list from slack');

    return getUsersList(config);
  }

  /**
   * Function to get channels in the slack team.
   * @param {object} config Config for get channel api.
   *
   * @return {array} List of public channel.
   * Look at slack docs for channel model.
   */
  fetchTeamChannels(config) {
    if (get(config, 'exclude', false)) {
      logger.info('Excluding channel list call');

      return {};
    }

    logger.info('Fetching channel list from slack');

    return getChannelsList(config);
  }

  /**
   * Function to get team user groups in the slack team.
   * @param {object} config Config for get user group api.
   *
   * @return {array} List of user groups.
   * Look at slack docs for user group model.
   */
  fetchTeamUserGroups(config) {
    if (get(config, 'exclude', false)) {
      logger.info('Excluding channel list call');

      return {};
    }

    logger.info('Fetching user group list from slack');

    return getUserGroupsList(config);
  }

  /**
   * Function to help get all slack team data such as users, channel.
   * @param {object} config Config for slack api.
   *
   * @return {object} Promise resolves to slack data.
   */
  getAllTeamData(config) {
    const options = {
      botToken: this.config.botToken,
      agent: this.getHttpAgent(),
    };

    return Promise.all([
      this.fetchTeamChannels(extend(get(config, 'channel'), options)),
      this.fetchTeamUsers(extend(get(config, 'user'), options)),
    ]);
  }

  /**
   * Function to register handlebar helper method used for templates.
   *
   * @return {object} Handler helper methods.
   */
  registerHandlebarsHelpers() {
    return {
      idFromEmail: (context) => {
        if (context) {
          return this.getSlackIdFromEmail(context);
        }
      },
      idFromEmailLocalPart: (context) => {
        if (context) {
          return this.getSlackIdFromEmailLocalPart(context);
        }
      },
      presenceFromEmail: (context) => {
        if (context) {
          return this.getPresenceFromEmail(context);
        }
      },
      presenceFromEmailLocalPart: (context) => {
        if (context) {
          return this.getPresenceFromEmailLocalPart(context);
        }
      },
      toLowerCase: (context) => {
        if (context) {
          return toLower(context);
        }
      },
      formatUnixTime: (context) => {
        const time = get(context, 'hash.value', 0);
        const offset = Number(get(context, 'hash.offset', 0));
        const format = get(context, 'hash.format', 'YYYY-MM-DD HH:mm');

        return unix(time).utcOffset(offset).format(format);
      },
      joinArray: (context, options) => {
        const separator = get(options, 'hash.separator', ' ');
        const prefix = get(options, 'hash.prefix', '');
        const suffix = get(options, 'hash.suffix', '');
        const arrayVal = context || [];

        if (!isArray(arrayVal)) {
          return `${arrayVal}`;
        }

        return prefix + (map(arrayVal, toLower) || []).join(separator) + suffix;
      },
      arrayItem: (context) => {
        const index = get(context, 'hash.index', 0);
        const arrayVal = get(context, 'hash.value', 0);

        if (!isArray(arrayVal)) {
          return arrayVal;
        }

        return nth(arrayVal, index);
      },
      safeString: (context) => {
        return new Handlebars.SafeString(context);
      },
      toPlural: (context) => {
        const length = get(context, 'hash.len', 0);
        const word = get(context, 'hash.word');

        if (!Number(length) || length === 0 || length === 1) {
          return word;
        }

        if (endsWith(word, 'y')) {
          return replace(word, 'y', 'ies');
        }

        const isMatched = compact(
          map(['s', 'x', 'z', 'ch'], (lastChr) => {
            return endsWith(word, lastChr);
          })
        );
        if (isMatched.length > 0) {
          return word + 'es';
        }

        return word + 's';
      },
      indent: (context) => {
        const length = get(context, 'hash.len', 0);

        return repeat(' ', length);
      },
    };
  }

  /**
   * Function to get slack id from email id.
   * @param {object} identifiers Attribute to slack user profile lookup.
   * @param {object} options options for slack profile lookup.
   * @param {object} options.matchLocalPart match email local part.
   *
   * @return {string} slack user id.
   */
  getSlackUserProfile(identifiers, options = {}) {
    let { email = '0', slackId = '0', userName = '0' } = identifiers;
    email = toUpper(email);
    const emailIdLocalPart = nth(split(toUpper(email), '@'));
    const user = find(this.getSlackData().members, (member) => {
      const profileEmail = toUpper(get(member, 'profile.email'));
      return (
        (profileEmail === email ||
          get(member, 'id') === slackId ||
          get(member, 'enterprise_user.id') === slackId ||
          get(member, 'name') === userName ||
          (options.matchLocalPart &&
            emailIdLocalPart === nth(split(profileEmail, '@')))) &&
        !get(member, 'deleted')
      );
    });

    if (user && user.id) {
      return user;
    }

    return {};
  }

  /**
   * Function to get slack id from email id.
   * @param {string} emailId user's email in slack.
   *
   * @return {string} slack user id.
   */
  getSlackIdFromEmail(emailId) {
    const uEmailId = toUpper(emailId);
    const user = find(this.getSlackData().members, (member) => {
      return toUpper(get(member, 'profile.email')) === uEmailId;
    });

    if (user && user.id) {
      return user.id;
    }

    return;
  }

  /**
   * Function to get slack id from email id local part.
   * @param {string} emailId user's email in slack.
   *
   * @return {string} slack user id.
   */
  getSlackIdFromEmailLocalPart(emailId) {
    const uEmailId = nth(split(toUpper(emailId), '@'));
    const user = find(this.getSlackData().members, (member) => {
      return (
        nth(split(toUpper(get(member, 'profile.email', '')), '@')) === uEmailId
      );
    });

    if (user && user.id) {
      return user.id;
    }

    return;
  }

  /**
   * Function to get slack users online presence from email.
   * @param {string} emailId user's email in slack.
   *
   * @return {string} slack user online presense, away/online.
   */
  getPresenceFromEmail(emailId) {
    const uEmailId = toUpper(emailId);
    const user = find(this.getSlackData().members, (member) => {
      return toUpper(get(member, 'profile.email')) === uEmailId;
    });

    if (user && user.presence) {
      return user.presence;
    }

    return;
  }

  /**
   * Function to get slack users online presence from email local part.
   * @param {string} emailId user's email in slack.
   *
   * @return {string} slack user online presense, away/online.
   */
  getPresenceFromEmailLocalPart(emailId) {
    const uEmailId = nth(split(toUpper(emailId), '@'));
    const user = find(this.getSlackData().members, (member) => {
      return (
        nth(split(toUpper(get(member, 'profile.email', '')), '@')) === uEmailId
      );
    });

    if (user && user.presence) {
      return user.presence;
    }

    return;
  }
};

/**
 * Function to replace tab and newline in messages to slack to be
 * used in json stringify.
 * @param {string} key json object key.
 * @param {string} value json object value.
 *
 * @return {string} modifies value.
 */
const jsonReplacer = function (key, value) {
  if (value && key === 'text') {
    return value.replace(/\n|\t/g, '').replace(/\\n/g, '\n');
  }

  return value;
};

/**
 * Function to rename channel in slack data when the event occurs.
 * @param {array} channels List of channels in slack data.
 * @param {object} message rename channel message from slack.
 */
const renameChannel = function (channels, message) {
  const channel = find(channels, {
    id: message.channel.id,
  });

  if (channel) {
    channel.name = message.channel.name;
    logger.debug('Channel rename ', channel.name);
  }
};

/**
 * Function to update new channel in slack data when the event occurs.
 * @param {array} channels List of channels in slack data.
 * @param {object} message new channel message from slack.
 */
const channelCreated = function (channels, message) {
  channels = (channels || []).length > 0 ? channels : [];
  channels.push(message.channel);
};

/**
 * Function to delete channel in slack data when the event occurs.
 * @param {array} channels List of channels in slack data.
 * @param {object} message delete channel message from slack.
 */
const channelDeleted = function (channels, message) {
  const deleteChannel = remove(channels, (channel) => {
    return channel.id == message.channel;
  });

  if ((deleteChannel || []).length > 0) {
    logger.debug('Channel delete updated for ', message.channel);
  }
};

/**
 * Function to update user data in slack data when the event occurs.
 * @param {array} members List of users in slack data.
 * @param {object} message user change message from slack.
 */
const userChange = function (members, message) {
  let user = find(members, {
    id: message.user.id,
  });

  if (user) {
    user = message.user;
    logger.debug('Updated profile for ', user.name);
  }
};

/**
 * Function to add user data in slack data when the event occurs.
 * @param {array} members List of users in slack data.
 * @param {object} message new user message from slack.
 */
const teamJoin = function (members, message) {
  members = isArray(members) ? members : [];
  members.push(message.user);
  logger.debug('Added user ', message.user.id);
};

/**
 * Function to update user presence data in slack data when the event occurs.
 * @param {array} members List of users in slack data.
 * @param {object} message user presence change message from slack.
 */
const presenceChange = function (members, message) {
  const user = find(members, {
    id: message.user,
  });

  if (user) {
    user.presence = message.presence;
    logger.debug('Updated profile for ', user.name);
  }
};

export { Bot };
