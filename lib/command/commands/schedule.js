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
        this.scheduleCommand = internals.getCommandArguments(parsedMessage);

        try {
          var job = new CronJob({
            cronTime: internals.getCronExpresion(parsedMessage),
            onTick: () => {
              (function (context, parsedMessage) {
                context.quietRespond(internals.getCommandArguments(parsedMessage));
              })(this, parsedMessage);
            },
            start: false,
            timeZone: 'America/Los_Angeles'
          });

          job.start();

          this.setTimer(parsedMessage, job);
        } catch (err) {
          onReject(err);
        }

        this.setEventStoreParsedMessage(parsedMessage);

        onFulfill(parsedMessage);
      }
    }).then(() => {
      return storage.updateEvents(this.getSlackData().self.name, 'events', {
        parsedMessage: parsedMessage,
        channels: [parsedMessage.channel]
      });
    });
  }

  process (parsedMessage) {
    return Promise.resolve({
      then: (onFulfill, onReject) => {
        console.log('process parsedMessage', parsedMessage)
        this.callback = (data) => {
          onFulfill(this.message.bind(this, internals.getCommandArguments(parsedMessage))(data));
        };

        try {
          this.getCommand(_.get(this, 'scheduleCommand.message.command')).data.apply(this, [{
              command: this.scheduleCommand.message.command, params: this.scheduleCommand.message.params
            },
            this.buildOptions(this.scheduleCommand, this.getSlackData(), this.purpose),
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
        console.log('notify parsedMessage', parsedMessage);
        this.messageHandler({
          channels: parsedMessage.channel,
          message: responseHandler.generateBotResponseTemplate({
            parsedMessage: parsedMessage,
            /* jshint ignore:start */
            recursive_success: true,
            /* jshint ignore:end */
          })
        });
        onFulfill();
      }
    });
  }

  message (parsedMessage, data) {
    var command = this.getCommand(_.get(this, 'scheduleCommand.message.command'));
    if (data && command.responseType || _.get(data, 'type')) {
      responseHandler.processFile({
        channels: [parsedMessage.channel],
        message: {
          data: data,
          commandName: _.get(this, 'scheduleCommand.message.command'),
          config: command.responseType
        }
      }, this.getBotConfig().botToken);
    } else if (data && _.isFunction(command.template)) {
      console.log('command.template', command.template);
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
    var scheduleCommand = internals.getCommandArguments(parsedMessage);
    var command = this.context[_.get(scheduleCommand, 'message.command')];
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
          var testCron = new CronJob(cron, () => {
            //console.log('this should not be printed');
          });
          testCron.stop();
          onFulfill();
        } catch (err) {
          onReject({ invalidCron: true, parsedMessage: parsedMessage });
        }
      }
    });
  }

  setTimer (parsedMessage, job) {
    var scheduleCommand = internals.getCommandArguments(parsedMessage);
    if (this.getTimer(scheduleCommand)) {
      this.getTimer(scheduleCommand).stop();
    }
    _.set(this.eventStore,
        scheduleCommand.channel + '_' + _.get(this, 'scheduleCommand.message.command') + '.timer', job);
  }
};

internals.getCronExpresion = function (parsedMessage) {
  var cronExpresion;
  var cronRegex = /\((.*?)\)/;
  cronExpresion = cronRegex.exec(_.join(parsedMessage.message.params, ' '));
  console.log('cronExpresion', _.join(parsedMessage.message.params, ' '));
  var cron = _.trim(_.nth(cronExpresion, 1));
  console.log('cron', cron);
  return cron;
};

internals.getCommandArguments = function (parsedMessage) {
  let result = [];
  _.forEach(_.slice(parsedMessage.message.params, 1, parsedMessage.message.params.length), function (value) {
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
