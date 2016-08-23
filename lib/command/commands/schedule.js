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
    return new Promise((resolve, reject) => {
      // var cronExpresion = internals.getCronExpresion(parsedMessage);

      // try {
      //   var job = new CronJob({
      //     cronTime: cronExpresion,
      //     onTick: () => {
      //       this.quietRespond(parsedMessage);
      //     },
      //     start: true,
      //     timeZone: 'America/Los_Angeles'
      //   });
      //   job.start();
      // } catch (err) {
      //   reject(err);
      // }

      //this.setEventStoreParsedMessage(parsedMessage);

      // this.setTimer(parsedMessage,
      //   setInterval(() => {
      //     this.quietRespond(parsedMessage);
      //   }, time));

      resolve(parsedMessage);

      // storage.updateEvents(this.getSlackData().self.name, 'events', {
      //   parsedMessage: parsedMessage,
      //   channels: [parsedMessage.channel]
      // }).then(() => {
      //   resolve(parsedMessage);
      // }).catch((err) => {
      //   reject(err);
      // });

    });
  }

  process (parsedMessage) {
    return new Promise((resolve, reject) => {
      resolve();
      // this.callback = (data) => {
      //   resolve(this.message.bind(this, parsedMessage)(data));
      // };

      // try {
      //   this.getCommand().data.apply(this, [{
      //       command: parsedMessage.message.command, params: parsedMessage.message.params
      //     },
      //     this.buildOptions(parsedMessage, this.getSlackData(), this.purpose),
      //       this.callback]);
      // } catch (err) {
      //   botLogger.logger.error('Command: error calling handler,' +
      //     'make sure to pass a proper function', err, err.stack);
      //   return reject(err);
      // }
    });
  }

  notify (parsedMessage) {
    return new Promise((resolve) => {
      // this.messageHandler({
      //   channels: parsedMessage.channel,
      //   message: responseHandler.generateBotResponseTemplate({
      //     parsedMessage: parsedMessage,
      //     /* jshint ignore:start */
      //     recursive_success: true,
      //     /* jshint ignore:end */
      //   })
      // });
      resolve();
    });
  }

  message (parsedMessage, data) {
    if (data && this.getCommand().responseType || _.get(data, 'type')) {
      responseHandler.processFile({
        channels: [parsedMessage.channel],
        message: {
          data: data,
          commandName: parsedMessage.message.command,
          config: this.getCommand().responseType
        }
      }, this.getBotConfig().botToken);
    } else if (data && _.isFunction(this.template)) {
      try {
        this.messageHandler({
          channels: [parsedMessage.channel],
          message: this.template(data)
        });
      } catch (err) {
        botLogger.logger.error('Command: make sure to pass a' +
          'compiled handlebar template', err, err.stack);
      }
    }
  }

  validate (parsedMessage) {
    return new Promise((resolve, reject) => {
      console.log('came to validate', parsedMessage);
      this.isCommandValid(parsedMessage).then(() => {
        resolve();
      }).catch((err) => {
        console.log('rejecting..', err);
        reject(err);
      })
    });
    // if (isCronValid) {

    // }
  }

  isCommandValid (parsedMessage) {
    return new Promise((resolve, reject) => {
      let scheduleCommand = internals.getCommandArguments(parsedMessage);
      let command = this.context[_.get(scheduleCommand, 'message.command')];
      if (command) {
        command.validate(scheduleCommand)
          .then(() => {
            return this.isCronValid(internals.getCronExpresion(parsedMessage));
          }).catch((err) => {
            console.log('response err', err);
            reject(err);
          });
      }
    });
  }

  isCronValid (cron) {
    return new Promise((resolve, reject) => {
      console.log('got cron', cron);
      try {
        var testCron = new CronJob(cron, function() {
            console.log('this should not be printed');
        })
        //console.log('testCron', testCron);
        //testCron.stop();
        resolve();
      } catch (err) {
        console.log('cron err', err);
        reject(err);
      }
    });
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
