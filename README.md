# [slack-quick-bots](http://www.slack-quick-bots.io)
[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]

Slack is awesome!! and this is slack bot solution for enterprise. For Latest docs visit [www.slack-quick-bots.io](http://www.slack-quick-bots.io)

## Why slack-quick-bots

STOP writing code for your bot, just pass your data to this module and rest is taken care.

slack-quick-bots is another slack bot module to help create multiple bots with very minimal code.

Basically, with `slack-quick-bots` running in a single machine you could run multiple bots all doing different operation or pulling data from different sources.

Some of the salient features

*  Pre-defined bot command behaviors with user preferred command name. Pre-defined command includes `data`, `recursive`, `alert` and predefined stop command.
*  Ability to generate cool graphs for your metrics in realtime. Has a dependency on [gnuplot](http://www.gnuplot.info) and [nodejs-plotter](https://github.com/usubram/nodejs-plotter).
*  Seamlessly use multiple bot inside same channel. Just do @botname {command} or {botname}.
*  Auto generated contextual help/error messages, so just setup the bot and forget it.
*  Configurable command param for great control.
*  Block direct message to a bot and hence bot could only respond in a public channel, now you know who is using the bot (sounds simple but a killer feature).
*  Access control a bot or specific bot command based on slack user id.
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

## Documentation
[www.slack-quick-bots.io](http://www.slack-quick-bots.io)

## License
Copyright (c) 2016 Umashankar Subramanian  
Licensed under the MIT license.

[npm-badge]: https://badge.fury.io/js/slack-quick-bots.svg
[npm-url]: https://badge.fury.io/js/slack-quick-bots
[travis-badge]: https://api.travis-ci.org/usubram/slack-quick-bots.svg
[travis-url]: https://travis-ci.org/usubram/slack-quick-bots
