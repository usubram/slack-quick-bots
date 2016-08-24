const handlebars = require('handlebars');
const fs = require('fs');
const sampleTemplate = fs.readFileSync('./test/mock/template/sample-template.hbs', 'utf8');

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
          data: function (input, options, callback) {
            callback({
              'param': input.params
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
            });
          }
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'AUTO'
        }
      },
      mock: {
        self: {
          name: 'testbot1',
          id: 'U1234567'
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
            });
          }
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'AUTO'
        }
      },
      mock: {
        self: {
          name: 'testbot1',
          id: 'U1234567'
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
            });
          }
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'AUTO'
        }
      },
      mock: {
        self: {
          name: 'testbot2',
          id: 'U1234567'
        }
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwKrtm'
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
            });
          }
        },
        STOP: {
          commandType: 'KILL',
          parentTask: 'AUTO'
        }
      },
      mock: {
        self: {
          name: 'testbot2',
          id: 'U1234567'
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
            });
          }
        },
        alert: {
          commandType: 'ALERT',
          timeInterval: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (input, options, callback) {
            callback({
              'param': input.params
            });
          }
        }
      },
      mock: {
        self: {
          name: 'testbot1',
          id: 'U1234567'
        },
        users: [{
          id: 'U0GG92T45', name: 'user1'
        }, {
          id: 'U0GG92T46', name: 'user2'
        }]
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
          data: function (input, options, callback) {
            callback({
              'param': input.params
            });
          }
        }
      },
      allowedUsers: ['U0GG92T45'],
      mock: {
        self: {
          name: 'testbot2',
          id: 'U1234567'
        },
        users: [{
          id: 'U0GG92T45', name: 'user1'
        }, {
          id: 'U0GG92T46', name: 'user2'
        }]
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS'
    }]
  },
  blockDirectMessage: {
    bots: [{
      botCommand: {
        PING: {
          commandType: 'DATA',
          allowedParam: [1, 2],
          defaultParamValue: 1,
          template: function () {
            return handlebars.compile(sampleTemplate);
          },
          data: function (input, options, callback) {
            callback({
              'param': input.params
            });
          }
        }
      },
      mock: {
        self: {
          name: 'testbot1',
          id: 'U1234567'
        },
        users: [{
          id: 'U0GG92T45', name: 'user1'
        }, {
          id: 'U0GG92T46', name: 'user2'
        }]
      },
      botToken: 'xoxb-16681282704-dYYl7qESWogOUbzdJdqwK5gS',
      blockDirectMessage: true
    }]
  }
};
