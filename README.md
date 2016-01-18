# slack-quick-bots 

[![Join the chat at https://gitter.im/usubram/slack-quick-bots](https://badges.gitter.im/usubram/slack-quick-bots.svg)](https://gitter.im/usubram/slack-quick-bots?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]

Slack is awesome!! and this is slack bot solution for enterprise.

## Why slack-quick-bots

slack-quick-bots is another slack bot module to help create multiple bots with minimal code. Basically, with `slack-quick-bots` running in a single machine you could run multiple bots all doing different operation or pulling data from different sources. 

Some of the salient features

*  Pre-defined bot command behaviors with user preferred command name. Pre-defined command includes data, recursive and recursive task killer command.
*  Support multiple bot at the same channel.
*  Auto generated help/error message.
*  Configurable command param for great control.
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

* `ping 2` bot will respond back `Hello 2` [sample.hbs].

* `start 5` bot for every 5mins will respond back with `Hello 5`.

* `stop start` will kill the recursive alerts.

### Bot in channel/group:

If you add the bot to a channel, message had to appended with the bot name `{botname} ping 2`.

```javascript
{
  bots: [{
  botCommand: {
    'PING': {
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
    'START': {
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
    'STOP': {
      commandType: 'KILL',
      parentTask: 'START'
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

`commandType` - Currently, only data, recursive, kill commands are supported.

  `Data` - Any data, but mind the limit size of the websocket.

  `Recursive` - Have this command send your data/alert recursive for a configurable time (minutes/hours)

  `Kill` - Command to kill the recursive command you setup. The `parentTask` tie them together.

`timeUnit` - This attribute is for `Recursive` command. Currently, accepts, `h` for hours and `s` for minutes. Default - `m`.

`template` - This take the *compiled* handlebars template for the data that you would be sending.

`data` - This takes a callback with which the data will be given to the bot.


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