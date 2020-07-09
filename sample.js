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
        validation: [{
          schema: [1, 1],
          default: [1, 1],
          help: [{
            sample: '{firstArg}',
            recommend: '1',
            error: '{{arg}} is incorrect',
          }, {
            sample: '{secondArg}',
            recommend: '1',
            error: '{{arg}} is incorrect',
          }],
        }],
        allowedChannels: ['G4G117PFG'],
        descriptionText: 'Command to show log metrics',
        helpText: '☞ this is log command',
        template: sampleTemplate,
        data: function (input, options, callback) {
          // input.command - for command name.
          // input.params - for params in array.
          // options.user.profile.email - email in slack.
          // options.hookUrl - custom webhook url.
          // options.channel - channel from which the command was fired.
          callback(null, {
            param: input.params + ' log',
          });
        },
      },
      logme: {
        commandType: 'DATA',
        validation: [{
          schema: [/[1]/, /[1]/],
          default: [1, 1],
          help: [{
            sample: '{firstArg}',
            recommend: '1',
            error: '{{arg}} is incorrect',
          }, {
            sample: '{secondArg}',
            recommend: '1',
            error: '{{arg}} is incorrect',
          }],
        }, {
          schema: [/[2]/, /[2]/],
          default: [2],
          help: [{
            sample: '{firstArg}',
            recommend: ['2', '2'],
            error: '{{arg}} is incorrect',
          }, {
            sample: '{secondArg}',
            recommend: '2',
            error: '{{arg}} is incorrect',
          }],
        }],
        helpText: '☞ this is log command',
        template: sampleTemplate,
        data: function (input, options, callback) {
          // input.command - for command name.
          // input.params - for params in array.
          // input.files - contains file input.
          // options.user.profile.email - email in slack.
          // options.hookUrl - custom webhook url.
          // options.channel - channel from which the command was fired.
          callback(null, {
            param: input.params + ' log',
          });
        },
      },
      trend: {
        commandType: 'DATA',
        responseType: {
          type: 'png',
          ylabel: 'errors',
          color: {
            bg: '#121F26',
            border: '#677E8C',
            ytics: '#B6C3CC',
            xtics: '#B6C3CC',
            xlabel: '#B6C3CC',
            ylabel: '#B6C3CC',
            grid: 'grey10',
            key: '#B6C3CC',
            title: '#FB4D0B'
          },
          timeUnit: 'm',
          title: 'Log data',
          logscale: false,
          style: 'lines',
          exec: {
            encoding: 'utf16',
          },
          yformat: '%t',
        },
        validation: [{
          schema: [1, 2],
          default: [1, 2],
          help: [{
            sample: '{firstArg}',
            recommend: '1',
            error: '{{arg}} is incorrect',
          }, {
            sample: '{secondArg}',
            recommend: '1',
            error: '{{arg}} is incorrect',
          }],
        }],
        helpText: '☞ this is trend command',
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
          callback(null, rand);
        },
      },
      error: {
        commandType: 'RECURSIVE',
        validation: [{
          schema: [/^(?:[1-9]\d?|100)$/],
          default: [1],
          help: [{
            sample: '{firstArg}',
            recommend: '1',
            error: '{{arg}} is incorrect',
          }, {
            sample: '{secondArg}',
            recommend: '1',
            error: '{{arg}} is incorrect',
          }],
        }],
        helpText: '☞ this is error command',
        template: sampleTemplate,
        data: function (input, options, callback) {
          callback(null, {
            param: input.params,
          });
        },
      },
      alert: {
        commandType: 'ALERT',
        timeInterval: 1,
        snooze: function (input, options) {
          return false;
        },
        helpText: '    → this a alert command',
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
          callback(null, dataArr);
        },
      },
      file: {
        commandType: 'DATA',
        helpText: '☞ this a file post command',
        data: function (input, options, callback) {
          callback(null, {
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
    slackApi: {
      user: {
        exclude: true,
        presence: false,
        limit: 1000,
      },
      channel: {
        exclude: true,
      },
    },
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
