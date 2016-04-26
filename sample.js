/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const SlackBot = require('./lib/index');
const handlebars = require('handlebars');
const fs = require('fs');
const sampleTemplate = fs.readFileSync('./sample.hbs', 'utf8');

var config = {
  bots: [{
    botCommand: {
      log: {
        commandType: 'DATA',
        allowedUsers: ['john'],
        allowedParam: [1, 2],
        defaultParamValue: 1,
        template: function() {
          return handlebars.compile(sampleTemplate);
        },
        data: function(input, options, callback) {
          // input.command - for command name.
          // input.params - for params in array.
          // options.user.email - email in slack.
          // options.hookUrl - custom webhook url.
          callback({
            param: input.params
          });
        }
      },
      trend: {
        commandType: 'DATA',
        responseType: {
          type: 'svg',
          ylabel: 'errors',
          timeUnit: 'm',
          title: 'Log data',
          logscale: false,
          style: 'lines'
        },
        allowedParam: [1, 2],
        defaultParamValue: 1,
        data: function(input, options, callback) {
          var dataArr = [ // Sample data
            [100, 120, 130, 110, 123, 90],
            [1, 120, 130, 110, 90, 85],
            [1, 120, 130, 1010, 140, 145],
            [100, 120, 130, 250, 140, 145],
            [100, 120, 130, 300, 140, 145],
            [100, 400, 130, 300, 140, 145],
            [100, 90, 130, 300, 140, 145],
            [100, 120, 130, 1010, 150, 90]
          ];
          var rand = dataArr[Math.floor(Math.random() * dataArr.length)];
          callback(rand);
        }
      },
      error: {
        commandType: 'RECURSIVE',
        lowerLimit: 0,
        upperLimit: 100,
        defaultParamValue: 1,
        template: function() {
          return handlebars.compile(sampleTemplate);
        },
        data: function(input, options, callback) {
          callback({
            param: input.params
          });
        }
      },
      alert: {
        commandType: 'ALERT',
        timeInterval: 1, // time due which call to the back is made.
        data: function(input, options, callback) {
          var dataArr = [ // Sample data
            [100, 120, 130, 110, 123, 90],
            [1, 120, 130, 110, 90, 85],
            [1, 120, 130, 1010, 140, 145],
            [100, 120, 130, 250, 140, 145],
            [100, 120, 130, 300, 140, 145],
            [100, 400, 130, 300, 140, 145],
            [100, 90, 130, 300, 140, 145],
            [100, 120, 130, 1010, 150, 90]
          ];
          var rand = dataArr[Math.floor(Math.random() * dataArr.length)];
          callback(rand);
        }
      }
    },
    blockDirectMessage: false,
    webHook: true,
    botToken: ''
  }, {
    botCommand: {
      traffic: {
        commandType: 'DATA',
        allowedParam: ['what', 'there'],
        timeUnit: 'm',
        defaultParamValue: 'what',
        template: function() {
          return handlebars.compile(sampleTemplate);
        },
        data: function(input, options, callback) {
          callback({
            param: input.params
          });
        }
      },
      start: {
        commandType: 'RECURSIVE',
        lowerLimit: 0,
        upperLimit: 100,
        defaultParamValue: 1,
        template: function() {
          return handlebars.compile(sampleTemplate);
        },
        data: function(input, options, callback) {
          callback({
            param: input.params
          });
        }
      }
    },
    botToken: '',
    webHook: true
    allowedUsers: ['john'],
    blockDirectMessage: true
  }],
  logger: console, // you could pass a winston logger.
  server: {
    port: 8080,
    webHook: true
  }
};

var slackBot = new SlackBot(config);
slackBot.start();
