/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2017 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const SlackBot = require('./lib/index');
const fs = require('fs');
const sampleTemplate = fs.readFileSync('./sample.hbs', 'utf8');
const moment = require('moment');

const args = process.argv.slice(2);

const config = {
  bots: [{
    botCommand: {
      log: {
        commandType: 'DATA',
        allowedParam: ['hello'], // allow any argument to a command
        helpText: '    → this is log command \\n',
        template: sampleTemplate,
        data: function (input, options, callback) {
          // input.command - for command name.
          // input.params - for params in array.
          // options.user.profile.email - email in slack.
          // options.hookUrl - custom webhook url.
          // options.channel - channel from which the command was fired.
          callback({
            param: input.params,
          });
        },
      },
      trend: {
        commandType: 'DATA',
        responseType: {
          type: 'png',
          ylabel: 'errors',
          timeUnit: 'm',
          title: 'Log data',
          logscale: false,
          style: 'lines',
          exec: {
            encoding: 'utf16',
          },
        },
        allowedParam: [1, 2],
        defaultParamValue: 1,
        helpText: '    → this is trend command \\n',
        data: function (input, options, callback) {
          const dataArr = [ // Sample data
            [100, 120, 130, 110, 123, 90],
            [1, 120, 130, 110, 90, 85],
            [1, 120, 130, 1010, 140, 145],
            [100, 120, 130, 250, 140, 145],
            [100, 120, 130, 300, 140, 145],
            [100, 400, 130, 300, 140, 145],
            [100, 90, 130, 300, 140, 145],
            [100, 120, 130, 1010, 150, 90],
          ];
          const rand = dataArr[Math.floor(Math.random() * dataArr.length)];
          callback(rand);
        },
      },
      error: {
        commandType: 'RECURSIVE',
        lowerLimit: 0,
        upperLimit: 100,
        defaultParamValue: 1,
        helpText: '    → this is error command \\n',
        template: sampleTemplate,
        data: function (input, options, callback) {
          callback({
            param: input.params,
          });
        },
      },
      alert: {
        commandType: 'ALERT',
        timeInterval: 1,
        helpText: '    → this a alert command \\n',
        algo: 'CUMULATIVE_DIFFERENCE',
        data: function (input, options, callback) {
          const dataArr = [ // Sample data
            {
              time: moment().unix() - 1000,
              value: 400,
            },
            {
              time: moment().unix(),
              value: 120,
            },
          ];
          callback(dataArr);
        },
      },
      file: {
        commandType: 'DATA',
        allowedParam: ['*'],
        helpText: '    → this a alert command \\n',
        data: function (input, options, callback) {
          callback({
            responseType: {
              type: 'xml',
              name: 'hello',
            },
            response: '<xml></xml>',
          });
        },
      },
    },
    schedule: true,
    blockDirectMessage: false,
    webHook: true,
    mock: {
      self: {
        name: 'testbot1',
        id: 'U1234567',
      },
    },
    botToken: args[0],
  }],
  // proxy: {
  //   url: 'http://proxy.socketproxy.com:8080/'
  // },
  logger: console, // you could pass a winston logger.
  server: {
    port: 9090,
    webHook: true,
  },
};

// const slackBot = new SlackBot(config, { isMock: true });
const slackBot = new SlackBot(config);
slackBot.start().then((botEvt) => {
  botEvt[0].on('message', (message) => {
    // do something with the message.
  });

  botEvt[0].on('connect', () => {
    // do something on bot connection.
  });

  botEvt[0].on('restart', () => {
    // do something on bot restart.
  });

  botEvt[0].on('close', () => {
    // do something on bot connection close.
  });
});
