# slack-quick-bots 
[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]

Slack is awesome!! and this is slack bot solution for enterprise.

## Why slack-quick-bots

STOP writing code for your bot, just pass your data to this module and rest is taken care.

slack-quick-bots is another slack bot module to help create multiple bots with very minimal code.

Basically, with `slack-quick-bots` running in a single machine you could run multiple bots all doing different operation or pulling data from different sources.

Some of the salient features

*  Pre-defined bot command behaviors with user preferred command name. Pre-defined command includes `data`, `recursive`, `alert` and predefined stop command.
*  Seamlessly use multiple bot inside same channel. Just do @botname {command} or {botname}
*  Auto generated contextual help/error messages, so just setup the bot and forget it.
*  Configurable command param for great control.
*  Block direct message to a bot and hence bot could only respond in a public channel, now you know who is using the bot (sounds simple but a killer feature).
*  Log support. Simple console or winston like, your choice.
*  exciting features to follow soon.

## Getting Started
Install the module with: `npm install slack-quick-bots`

## Step 1:

Go to https://my.slack.com/services/new/bot - Create a bot with a cool name!! and don't forgot to 
make a note of the bot token.

## Step 2:

Do `npm install slack-quick-bots` in your app. Set up the below `config` by defining your bots (You read it right, you can define `n` number of bot for different purpose with just this 3 steps) , commands and bind the data to your data source as a callback.

## Step 3: 

To get started immediately, try [sample.js](https://github.com/usubram/slack-quick-bots/blob/master/sample.js)

```javascript
var SlackBot = require('slack-quick-bots');
var mybots = new SlackBot(config);
mybots.start(); // 'awesome'
```

## Finally:

Ping the bot with your custom command or add the bot to the channel/group to watch the fun.

Pass few information in the `config` and is all you need for the bot. With the below config are running a bot with command,

### DM to bot:

* `traffic 2` bot will respond back `Total of 3000 visits in the last 2 mins` [sample.hbs].

* `error 5` bot for every 5 mins will respond back with `10 errors in the last 5 mins`.

* `stop error` will stop the recursive alerts.

### Bot in channel/group:

If you add the bot to a channel, message had to appended with the bot name `{botname} ping 2`.

```javascript
{
  bots: [{
  botCommand: {
    'traffic': {
      commandType: 'DATA',
      allowedParam: [],
      lowerLimit: 1,
      upperLimit: 5,
      defaultParamValue: 5,
      template: function() {
        return handlebars.compile({sampleTemplate});
      },
      data: function(command, param, callback) {
        callback({data: 'data fetched from service'});
      }
    },
    'error': {
      commandType: 'RECURSIVE',
      lowerLimit: 1,
      upperLimit: 5,
      timeUnit: 'm',
      defaultParamValue: 5,
      template: function() {
        return handlebars.compile(sampleTemplate);
      },
      data: function(command, param, callback) {
        callback({data: 'data fetched from service'});
      }
    },
    'alert': {
      commandType: 'ALERT',
      lowerLimit: 1,
      upperLimit: 5,
      timeUnit: 'm',
      defaultParamValue: 5,
      template: function() {
        return handlebars.compile(sampleTemplate);
      },
      data: function(command, param, callback) {
        callback({data: 'data fetched from service'});
      }
    }
  },
  botToken: ''
  }]
}
```

## Documentation
_( More coming soon)_

`bots` - Array to hold bots information.

`botToken` - Holds the slack api bot token.

`botCommand` - Object to hold all the fancy command that you would like. Object key is command,
so no spaces, try to keep it short and nice for some to remember.

`commandType` - Currently, only data, recursive commands are supported.

  `Data` - Any data, but mind the limit size of the websocket.

  `Recursive` - Have this command send your data recursive for a configurable time (minutes/hours)

  `alert` - Have this command send your alert for a configurable time (minutes/hours) when the data has
  a dip or a peak. This command basically takes a series of data and computes the variance between them and
  alerts. Make sure to pass a even number of events.

`timeUnit` - This attribute is for `Recursive` command. Currently, accepts, `h` for hours and `s` for minutes. Default - `m`.

`template` - This take the *compiled* handlebars template for the data that you would be sending.

`data` - This takes a callback with which the data will be given to the bot.

`blockDirectMessage` - Block a bot from responding to a DM and hence only allowing it to respond in a public channel.


## Examples
_(Coming soon)_

## Contributing
_(Coming soon)_

## Release History
_(Nothing yet)_

## License
Copyright (c) 2016 Umashankar Subramanian  
Licensed under the MIT license.

[npm-badge]: https://badge.fury.io/js/slack-quick-bots.svg
[npm-url]: https://badge.fury.io/js/slack-quick-bots
[travis-badge]: https://api.travis-ci.org/usubram/slack-quick-bots.svg
[travis-url]: https://travis-ci.org/usubram/slack-quick-bots