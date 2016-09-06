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
const CronJob = require('cron').CronJob;

const root = '..';

const botLogger = require(path.join(root, '../utils/logger'));
const Command = require(path.join(root, 'command'));
const responseHandler = require(path.join(root, '../bot/response-handler'));
const storage = require(path.join(root, '../storage/storage'));

const externals = {};
const internals = {};

externals.Schedule = class extends Command {
  constructor (options) {
    super(options);
    return this;
  }

  preprocess (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        try {

          let job = new CronJob({
            cronTime: internals.getCronExpresion(parsedMessage),
            onTick: () => {
              let scheduleCommand = internals.getCommandArguments(parsedMessage);
              let command = this.context[_.get(scheduleCommand, 'message.command')];
              command.quietRespond(scheduleCommand);
            },
            start: false,
            timeZone: 'America/Los_Angeles'
          });

          job.start();

          this.setTimer(parsedMessage, job);
        } catch (err) {
          onReject(err);
        }

        onFulfill(parsedMessage);
      }
    }).then(() => {
      return storage.updateEvents(this.getSlackData().self.name, 'schedule', {
        parsedMessage: parsedMessage,
        channels: [parsedMessage.channel]
      });
    });
  }

  process (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        let scheduleCommand = internals.getCommandArguments(parsedMessage);
        this.callback = (data) => {
          onFulfill(this.message.bind(this, scheduleCommand)(data));
        };

        try {
          this.getCommand(_.get(scheduleCommand, 'message.command')).data.apply(this, [{
              command: scheduleCommand.message.command, params: scheduleCommand.message.params
            },
            this.buildOptions(scheduleCommand, this.getSlackData(), this.purpose),
              this.callback]);
        } catch (err) {
          botLogger.logger.error('Command: error calling handler,' +
            'make sure to pass a proper function', err, err.stack);
          return onReject(err);
        }
      }
    });
  }

  notify (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill) => {
        this.messageHandler({
          channels: parsedMessage.channel,
          message: responseHandler.generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            /* jshint ignore:start */
            schedule_success: true
            /* jshint ignore:end */
          })
        });
        onFulfill();
      }
    });
  }

  message (parsedMessage, data) {
    let command = this.getCommand(_.get(parsedMessage, 'message.command'));
    if (data && command.responseType || _.get(data, 'type')) {
      responseHandler.processFile({
        channels: [parsedMessage.channel],
        message: {
          data: data,
          commandName: _.get(parsedMessage, 'message.command'),
          config: command.responseType
        }
      }, this.getBotConfig().botToken);
    } else if (data && _.isFunction(command.template)) {
      try {
        this.messageHandler({
          channels: [parsedMessage.channel],
          message: command.template()(data)
        });
      } catch (err) {
        botLogger.logger.error('Command: make sure to pass a' +
          'compiled handlebar template', err, err.stack);
      }
    }
  }

  validate (parsedMessage) {
    let scheduleCommand = internals.getCommandArguments(parsedMessage);
    let command = this.context[_.get(scheduleCommand, 'message.command')];

    if (!command) {
      return Promise.reject({ invalidCommand: true, parsedMessage: parsedMessage });
    }

    return Promise.resolve(this.isCommandValid(scheduleCommand, command))
      .then(() => {
        return this.isCronValid(internals.getCronExpresion(parsedMessage), parsedMessage);
      });
  }

  isCommandValid (scheduleCommand, command) {
    return Promise.resolve(command.validate(scheduleCommand));
  }

  isCronValid (cron, parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        try {
          if (_.isEmpty(cron) || cron.length > 9 && cron.indexOf('* * * * *') > -1) {
            onReject({ invalidCron: true, parsedMessage: parsedMessage });
          }

          let testCron = new CronJob(cron, () => { });
          testCron.stop();
          onFulfill();
        } catch (err) {
          onReject({ invalidCron: true, parsedMessage: parsedMessage });
        }
      }
    });
  }

  setTimer (parsedMessage, job) {
    let scheduleCommand = internals.getCommandArguments(parsedMessage);
    if (this.getTimer(parsedMessage)) {
      this.getTimer(parsedMessage).stop();
    }
    _.set(this.eventStore,
        scheduleCommand.channel + '_schedule_' +
        _.get(scheduleCommand, 'message.command') + '.timer', job);
  }

  getTimer (parsedMessage) {
    let scheduleCommand = internals.getCommandArguments(parsedMessage);
    return _.get(this.eventStore,
      scheduleCommand.channel + '_schedule_' +
      _.get(scheduleCommand, 'message.command') + '.timer');
  }
};

internals.getCronExpresion = function (parsedMessage) {
  let cronRegex = /\((.*?)\)/;
  let cronExpresion = cronRegex.exec(_.join(parsedMessage.message.params, ' '));
  return _.trim(_.nth(cronExpresion, 1));
};

internals.getCommandArguments = function (parsedMessage) {
  let result = [];
  _.forEach(_.slice(_.get(parsedMessage, 'message.params'), 1,
      _.get(parsedMessage, 'message.params', []).length), function (value) {
    if (_.isString(value) && value.indexOf('(') > -1) {
      return false;
    }
    result.push(value);
  });
  return {
    type: 'message',
    channel: parsedMessage.channel,
    message: {
      command: _.nth(parsedMessage.message.params),
      params: result
    }
  };
};

module.exports = externals.Schedule;
