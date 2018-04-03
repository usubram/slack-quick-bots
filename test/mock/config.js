'use strict';

const fs = require('fs');
const sampleTemplate = fs.readFileSync('./test/mock/template/' +
  'sample-template.hbs', 'utf8');

exports = module.exports = {
  singleBot: {
    bots: [{
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        AUTO: {
          commandType: 'RECURSIVE',
          lowerLimit: 0,
          upperLimit: 100,
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'AUTO',
        },
      },
      mock: {
        self: {
          name: 'testbot1',
          id: 'U1234567',
        },
        members: [{
          id: 'U0GG92T45', name: 'user1',
        }, {
          id: 'U0GG92T46', name: 'user2',
        }],
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS',
    }],
  },
  multipleBot: {
    bots: [{
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        AUTO: {
          commandType: 'RECURSIVE',
          lowerLimit: 0,
          upperLimit: 100,
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'AUTO',
        },
      },
      mock: {
        self: {
          name: 'testbot1',
          id: 'U1234567',
        },
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS',
    }, {
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        AUTO: {
          commandType: 'RECURSIVE',
          lowerLimit: 0,
          upperLimit: 100,
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'AUTO',
        },
      },
      mock: {
        self: {
          name: 'testbot2',
          id: 'U1234567',
        },
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwKrtm',
    }],
  },
  BotsTest: {
    bots: [{
      botCommand: {
        'PING-ME': {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS',
    }],
  },
  BotsTestWithRecursiveTasks: {
    bots: [{
      botCommand: {
        'PING-ME': {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        'auto data': {
          commandType: 'RECURSIVE',
          lowerLimit: 0,
          upperLimit: 100,
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        STOP: { // eslint-disable-line
          commandType: 'KILL',
          parentTask: 'auto data',
        },
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS',
    }],
  },
  singleBotForAllowedParam: {
    bots: [{
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        PINGSIM: {
          commandType: 'DATA',
          allowedParam: [[1, 2], [3, 4]],
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        PINGARG: {
          commandType: 'DATA',
          allowedParam: [[1, 2], [3, 4]],
          paramsHelpMessage: [{
            recommend: '1',
            error: '{{arg}} is incorrect',
          }, {
            recommend: '3',
            error: '{{arg}} is incorrect',
          }],
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        PINGREGEX: {
          commandType: 'DATA',
          allowedParam: [/([1-5])/, /([6-9])/],
          paramsHelpMessage: [{
            recommend: '1',
            error: '{{arg}} is incorrect',
          }, {
            recommend: '3',
            error: '{{arg}} is incorrect',
          }],
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        pingLimit: {
          commandType: 'DATA',
          lowerLimit: 1,
          upperLimit: 10,
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        hybrid: {
          commandType: 'DATA',
          allowedParam: ['test', 'validate'],
          lowerLimit: 1,
          upperLimit: 10,
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        AUTO: {
          commandType: 'RECURSIVE',
          lowerLimit: 0,
          upperLimit: 100,
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'AUTO',
        },
      },
      mock: {
        self: {
          name: 'testbot2',
          id: 'U1234567',
        },
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS',
    }],
  },
  commandTypeBots: {
    bots: [{
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        pingLimit: {
          commandType: 'DATA',
          lowerLimit: 1,
          upperLimit: 10,
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        AUTO: {
          commandType: 'RECURSIVE',
          lowerLimit: 0,
          upperLimit: 100,
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        alert: {
          commandType: 'ALERT',
          timeInterval: 1,
          algo: 'CUMULATIVE_DIFFERENCE',
          data: function (input, options, callback) {
            const dataArr = [ // Sample data
              {
                time: +new Date() - 1000,
                value: 400,
              },
              {
                time: +new Date(),
                value: 120,
              },
            ];
            callback(null, dataArr);
          },
        },
        trend: {
          commandType: 'DATA',
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
        stats: {
          commandType: 'DATA',
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
      },
      mock: {
        self: {
          name: 'testbot1',
          id: 'U1234567',
        },
        members: [{
          id: 'U0GG92T45', name: 'user1',
        }, {
          id: 'U0GG92T46', name: 'user2',
        }],
      },
      schedule: true,
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS',
    }],
  },
  isCommandAllowed: {
    bots: [{
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
      },
      allowedUsers: ['U0GG92T45'],
      mock: {
        self: {
          name: 'testbot2',
          id: 'U1234567',
        },
        members: [{
          id: 'U0GG92T45', name: 'user1',
        }, {
          id: 'U0GG92T46', name: 'user2',
        }],
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS',
    }],
  },
  blockDirectMessage: {
    bots: [{
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: sampleTemplate,
          data: function (input, options, callback) {
            callback(null, {
              'param': input.params,
            });
          },
        },
      },
      mock: {
        self: {
          name: 'testbot1',
          id: 'U1234567',
        },
        members: [{
          id: 'U0GG92T45', name: 'user1',
        }, {
          id: 'U0GG92T46', name: 'user2',
        }],
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS',
      blockDirectMessage: true,
    }],
  },
  alertCommandBots: {
    bots: [{
      botCommand: {
        ALERT: {
          commandType: 'ALERT',
          allowedParam: [1, 2],
          timeInterval: 1,
          template: sampleTemplate,
          algo: 'CUMULATIVE_DIFFERENCE',
          data: function (input, options, callback) {
            callback(null, [
              {time: 1511149547, value: 80},
              {time: 1511149581, value: 1},
            ]);
          },
        },
      },
      mock: {
        self: {
          name: 'testbot1',
          id: 'U1234567',
        },
        members: [{
          id: 'U0GG92T45', name: 'user1',
        }, {
          id: 'U0GG92T46', name: 'user2',
        }],
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS',
    }],
  },
  events: {
    testbot1: {
      D2U7WA3PD_auto: {
        parsedMessage: {
          type: 'message',
          channel: 'D2U7WA3PD',
          user: 'U0VM3V6G3',
          text: 'auto',
          ts: '1488154681.000008',
          team: 'T0GGDKVDE',
          message: {
            command: 'auto',
            params: [],
          },
        },
        channels: [
          'D2U7WA3PD',
        ],
      },
    },
  },
  schedule: {
    testbot1: {
      byuvavsyz: {
        parsedMessage: {
          type: 'message',
          channel: 'D4BSZUSN8',
          user: 'U024L29TS',
          text: '<@U0Y0KFJ90> schedule ping 1 (* * * * *)',
          ts: '1481052561.004683',
          team: 'T024GHP2K',
          message: {
            commandPrefix: 'opmbot',
            command: 'SCHEDULE',
            params: [
              'ping',
              '1',
              '(*',
              '*',
              '*',
              '*',
              '*)',
            ],
          },
          scheduleId: 'byuvavsyz',
        },
        channels: [
          'D4BSZUSN8',
        ],
      },
    },
  },
};
