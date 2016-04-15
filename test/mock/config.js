const handlebars = require('handlebars');
const fs = require('fs');
const sampleTemplate = fs.readFileSync('./sample.hbs', 'utf8');

exports = module.exports = {
  singleBot: {
    bots: [{
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        },
        AUTO: {
          commandType: 'RECURSIVE',
          lowerLimit: 0,
          upperLimit: 100,
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'AUTO'
        }
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS'
    }]
  },
  multipleBot: {
    bots: [{
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            console.log(param);
            callback({
              'param': param
            });
          }
        },
        AUTO: {
          commandType: 'RECURSIVE',
          lowerLimit: 0,
          upperLimit: 100,
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'AUTO'
        }
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS'
    }, {
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            console.log(param);
            callback({
              'param': param
            });
          }
        },
        AUTO: {
          commandType: 'RECURSIVE',
          lowerLimit: 0,
          upperLimit: 100,
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'AUTO'
        }
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS'
    }]
  },
  BotsTest: {
    bots: [{
      botCommand: {
        'PING-ME': {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            console.log(param);
            callback({
              'param': param
            });
          }
        }
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS'
    }]
  },
  BotsTestWithRecursiveTasks: {
    bots: [{
      botCommand: {
        'PING-ME': {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            console.log(param);
            callback({
              'param': param
            });
          }
        },
        'auto data': {
          commandType: 'RECURSIVE',
          lowerLimit: 0,
          upperLimit: 100,
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'auto data'
        }
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS'
    }]
  },
  singleBotForAllowedParam: {
    bots: [{
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        },
        pingLimit: {
          commandType: 'DATA',
          lowerLimit: 1,
          upperLimit: 10,
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        },
        hybrid: {
          commandType: 'DATA',
          allowedParam: ['test', 'validate'],
          lowerLimit: 1,
          upperLimit: 10,
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        },
        AUTO: {
          commandType: 'RECURSIVE',
          lowerLimit: 0,
          upperLimit: 100,
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'AUTO'
        }
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS'
    }]
  },
  commandTypeBots: {
    bots: [{
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        },
        pingLimit: {
          commandType: 'DATA',
          lowerLimit: 1,
          upperLimit: 10,
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        },
        AUTO: {
          commandType: 'RECURSIVE',
          lowerLimit: 0,
          upperLimit: 100,
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        },
        alert: {
          commandType: 'ALERT',
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        }
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS'
    }]
  },
  isCommandAllowed: {
    bots: [{
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (command, param, callback) {
            callback({
              'param': param
            });
          }
        }
      },
      allowedUsers: ['U0GG92T45'],
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS'
    }]
  }
};
