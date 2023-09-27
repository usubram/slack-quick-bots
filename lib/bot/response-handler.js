'use strict';

import * as lodash from 'lodash-es';
import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';

import logger from '../utils/logger.js';
import { StreamFile } from '../bot/stream-file.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const errorFilePath = join(__dirname, '../template/error.hbs');
const helpFilePath = join(__dirname, '../template/help.hbs');
const alertFilePath = join(__dirname, '../template/alert.hbs');
const errorTemplate = Handlebars.compile(readFileSync(errorFilePath, 'utf8'));
const helpTemplate = Handlebars.compile(readFileSync(helpFilePath, 'utf8'));
const alertTemplate = Handlebars.compile(readFileSync(alertFilePath, 'utf8'));

const { isEmpty, filter, set, startsWith, reduce, take, cloneDeep, toUpper } =
  lodash;
const CONFIG = {
  commandTypes: ['data', 'recursive', 'kill', 'alert'],
  alertParams: ['setup', 'sample'],
};

/**
 * Function to generate contextual error message.
 * @param {string} botName bot name.
 * @param {object} botCommand bot command config.
 * @param {object} context error message context.
 *
 * @return {string} rendered error message.
 */
const generateErrorTemplate = function (botName, botCommand, context) {
  let renderedTemplate = '';
  let commandContext = getContextualErrorResponse(botCommand, context);

  if (isEmpty(commandContext)) {
    commandContext = getCommonErrorResponse(botCommand);
  }

  const data = {
    command: commandContext,
    restrictedUser: context.restrictedUser,
    restrictedChannel: context.restrictedChannel,
    invalidCron: context.invalidCron,
    invalidCommand: context.invalidCommand,
    botName: context.botName,
    users: context.users,
    cause: context.cause,
    contextBool:
      filter(commandContext, (o) => {
        return o.inContext || o.errorContext;
      }).length > 0
        ? true
        : false,
    prefix: isDirectMessage(context.parsedMessage) ? '' : botName,
  };

  try {
    renderedTemplate = context.template
      ? context.template
      : errorTemplate(data);
  } catch (err) {
    logger.info('Invalid handler template', err);
  }

  return renderedTemplate;
};

/**
 * Function to handle file post.
 * @param {object} context error message context.
 * @param {string} botToken bot token.
 * @param {object} agent http proxy agent.
 */
const processFile = function (context, botToken, agent) {
  set(context, 'message.config.botToken', botToken);
  set(context, 'message.config.agent', agent);
  set(context, 'message.config.commandName', context.message.commandName);
  set(context, 'message.config.thread', context.message.thread);

  new StreamFile(context.channels, context.message.data, context.message.config)
    .then((response) => {
      if (response.ok !== true) {
        logger.error('Error responseType ', response);
      }
    })
    .catch((err) => {
      logger.error('Error uploading file to slack ', err);
    });
};

/**
 * Function to generate alert response.
 * @param {object} context error message context.
 *
 * @return {string} rendered error message.
 */
const generateAlertResponseTemplate = function (context) {
  return context.template ? context.template(context) : alertTemplate(context);
};

/**
 * Function to generate bot autonomous response.
 * @param {object} context error message context.
 *
 * @return {string} rendered error message.
 */
const generateBotResponseTemplate = function (context) {
  return context.template ? context.template(context) : helpTemplate(context);
};

/**
 * Function to get if request is from DM.
 * @param {object} parsedMessage Message returned @link command/message.js.
 *
 * @return {boolean} boolean.
 */
const isDirectMessage = function (parsedMessage) {
  return startsWith(parsedMessage.channel, 'D', 0);
};

/**
 * Function to get if request is from private channel.
 * @param {object} parsedMessage Message returned @link command/message.js.
 *
 * @return {boolean} boolean.
 */
const isPrivateMessage = function (parsedMessage) {
  return startsWith(parsedMessage.channel, 'G', 0);
};

/**
 * Function to get if request is from public channel.
 * @param {object} parsedMessage Message returned @link command/message.js.
 *
 * @return {boolean} boolean.
 */
const isPublicMessage = function (parsedMessage) {
  return startsWith(parsedMessage.channel, 'C', 0);
};

/**
 * Function to help generate props to error in template.
 * @param {object} botCommand bot command config.
 *
 * @return {object} botCommand with props.
 */
const getCommonErrorResponse = function (botCommand) {
  return reduce(
    botCommand,
    function (item, value, key) {
      item[key] = value;
      item[key].name = key;

      if (value.commandType === 'FLOW' && value.validation) {
        item[key].validation = take(value.validation, 2);
      }

      if (!isEmpty(value.helpText)) {
        item[key].helpText = value.helpText;
      }

      return item;
    },
    {}
  );
};

/**
 * Function to help generate contextual errors.
 * @param {object} botCommand bot command config.
 * @param {object} context context with error props.
 *
 * @return {object} botCommand with props.
 */
const getContextualErrorResponse = function (botCommand, context) {
  const commandName = context.parsedMessage.message.command;
  const param = context.parsedMessage.message.params
    ? context.parsedMessage.message.params[0]
    : '';

  return reduce(
    cloneDeep(
      filter(botCommand, function (n, key) {
        return toUpper(key) === toUpper(commandName);
      })
    ),
    function (item, value) {
      item[commandName] = value;

      if (
        item[commandName].commandType === 'FLOW' &&
        item[commandName].validation
      ) {
        item[commandName].validation = take(value.validation, 2);
      }

      item[commandName].name = commandName;
      item[commandName].inContext = context.noOfErrors > 0 ? false : true;
      item[commandName].errorContext = context.noOfErrors > 0 ? true : false;
      item[commandName].failedParams = context.failedParams;
      item[commandName].noOfErrors = context.noOfErrors;
      item[commandName].sampleParams = context.sampleParams;

      if (
        CONFIG.commandTypes[3] === commandName &&
        CONFIG.alertParams[0] === param
      ) {
        item[commandName].alertContext = true;
      }

      return item;
    },
    {}
  );
};

export {
  generateErrorTemplate,
  processFile,
  generateAlertResponseTemplate,
  generateBotResponseTemplate,
  isDirectMessage,
  isPrivateMessage,
  isPublicMessage,
};
