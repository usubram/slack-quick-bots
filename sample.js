'use strict';

const SlackBot = require('./lib/index');
const handlebars = require('handlebars');
const fs = require('fs');
const sampleTemplate = fs.readFileSync('./sample.hbs', 'utf8');

var config = {
  'bots': [{
    'botCommand': {
      'log_error': {
        'commandType': 'DATA',
        'allowedParam': [1, 2],
        'defaultParamValue': 1,
        'template': function() {
          return handlebars.compile(sampleTemplate);
        },
        'data': function(command, param, callback) {
          callback({
            'param': param
          });
        }
      },
      'error_rate': {
        'commandType': 'RECURSIVE',
        'lowerLimit': 0,
        'upperLimit': 100,
        'defaultParamValue': 1,
        'template': function() {
          return handlebars.compile(sampleTemplate);
        },
        'data': function(command, param, callback) {
          callback({
            'param': param
          });
        }
      },
      'listen_to_dip': {
        'commandType': 'ALERT',
        'template': function() {
          return handlebars.compile(sampleTemplate);
        },
        'data': function(command, param, callback) {
          var dataArr = [
            [100, 120, 130, 110],
            [1, 120, 130, 110],
            [1, 120, 130, 1010],
            [100, 120, 130, 1010]
          ]
          var rand = dataArr[Math.floor(Math.random() * dataArr.length)];
          callback(rand);
        }
      },
      'stop_error': {
        'commandType': 'KILL',
        'parentTask': 'error_rate'
      }
    },
    'blockDirectMessage': false,
    'botToken': 'xoxb-16681282704-l4UkOfmVDe9SOyYbYhtcuPXC'
  }, {
    'botCommand': {
      'traffic_stats': {
        'commandType': 'DATA',
        'allowedParam': ['what', 'there'],
        'timeUnit': 'm',
        'defaultParamValue': 'what',
        'template': function() {
          return handlebars.compile(sampleTemplate);
        },
        'data': function(command, param, callback) {
          callback({
            'param': param
          });
        }
      },
      'traffic_peak_stats': {
        'commandType': 'RECURSIVE',
        'lowerLimit': 0,
        'upperLimit': 100,
        'defaultParamValue': 1,
        'template': function() {
          return handlebars.compile(sampleTemplate);
        },
        'data': function(command, param, callback) {
          callback({
            'param': param
          });
        }
      },
      'stop_stats': {
        'commandType': 'KILL',
        'parentTask': 'traffic_peak_stats'
      }
    },
    'botToken': 'xoxb-16680277201-Cak8kTqwJle4ZjZHGMPEG8fb'
  }],
  logger: console  // you could pass a winston logger.
};

var slackBot = new SlackBot(config);
slackBot.start();