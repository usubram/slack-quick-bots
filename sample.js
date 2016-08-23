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

var args = process.argv.slice(2);

var config = {
  bots: [{
    botCommand: {
      log: {
        commandType: 'DATA',
        lowerLimit: 0,
        upperLimit: 10,
        //allowedParam: ['*'], // allow any argument to a command
        helpText: ':small_orange_diamond: this is log command \\n',
        template: function() {
          return handlebars.compile(sampleTemplate);
        },
        data: function(input, options, callback) {
          // input.command - for command name.
          // input.params - for params in array.
          // options.user.profile.email - email in slack.
          // options.hookUrl - custom webhook url.
          // options.channel - channel from which the command was fired.
          callback({
            param: input.params
          });
        }
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
          exec: { encoding: 'utf16' }
        },
        allowedParam: [1, 2],
        defaultParamValue: 1,
        helpText: ':small_red_triangle_down: this is trend command \\n',
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
        helpText: ':small_orange_diamond: this is error command \\n',
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
        helpText: ':small_red_triangle_down: this a alert command \\n',
        template: function() {
          return handlebars.compile(sampleTemplate);
        },
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
      file: {
        commandType: 'DATA',
        allowedParam: ['*'],
        helpText: ':small_red_triangle_down: this a alert command \\n',
        data: function(input, options, callback) {
          callback({
            responseType: {
              type: 'xml',
              name: 'hello'
            },
            response: '<xml></xml>'
          });
        }
      }
    },
    schedule: true,
    blockDirectMessage: false,
    webHook: true,
    botToken: args[0]
  }
  // ,
  // {
  //   botCommand: {
  //     traffic: {
  //       commandType: 'DATA',
  //       allowedParam: ['what', 'there'],
  //       timeUnit: 'm',
  //       defaultParamValue: 'what',
  //       template: function() {
  //         return handlebars.compile(sampleTemplate);
  //       },
  //       data: function(input, options, callback) {
  //         callback({
  //           param: input.params
  //         });
  //       }
  //     },
  //     start: {
  //       commandType: 'RECURSIVE',
  //       lowerLimit: 0,
  //       upperLimit: 100,
  //       defaultParamValue: 1,
  //       template: function() {
  //         return handlebars.compile(sampleTemplate);
  //       },
  //       data: function(input, options, callback) {
  //         callback({
  //           param: input.params
  //         });
  //       }
  //     }
  //   },
  //   botToken: args[1],
  //   webHook: true,
  //   allowedUsers: ['john'],
  //   blockDirectMessage: true
  // }
  ],
  logger: console, // you could pass a winston logger.
  server: {
    port: 9090,
    webHook: true
  }
};

var slackBot = new SlackBot(config);
slackBot.start();
