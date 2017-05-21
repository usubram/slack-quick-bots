# slack-quick-bots
[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Dependency Status][daviddm-image]][daviddm-url]

Command driven slack bot library focused to quickly rolled out api/data driven bots abstracting most common bot needs for the enterprise.

```javascript
const SlackBot = require('slack-quick-bots');
const coolBot = new SlackBot({
  // all bot config
});
coolBot.start();
```

## Simple bots
[Sample bot](https://github.com/usubram/slack-quick-bots-reference)
Clone and get started!!

[Pagerduty bot](https://github.com/usubram/pagerdutybot)

## Config schema

slack-quick-bots uses handlebars template as a view layer for all bot messages. When `callback` with called with `data` it is rendered against the template. [Templates](https://github.com/usubram/slack-quick-bots-reference/blob/master/template/sample_tmpl.hbs) are like html and the data is inject into the template before it is sent to slack.

```javascript
{
  bot: [{
    botCommand: {
      firstCommand: {
        commandType: 'DATA',
        template: sampleTmpl,
        data: function(input, options, callback) {
          // input.command - for command name.
          // input.params - for params in array.
          // options.user.profile.email - email in slack.
          // options.channel - channel from which the command was fired.
          callback({
            data: 'message to respond for command goes here'
          });
        }
      }
    }
    schedule: true,   // Generic schedule command for all bot command. Example command (schedule firstCommand (* * * * *)) executes firstCommand for every minute.
    botToken: args[0]
  }]
}
```

## Command format

In channel @botname {command} ['params1', 'params2']

```
@newbot firstCommand param1 params2
```

DM {command} ['params1', 'params2']

```
firstCommand param1 params2
```

### Schedule command

schedule commandName [params] (* * * * *)

```
schedule firstCommand params1 params2 (* * * * *)
```

### Stop command

Use to stop a schedule command. A stop is automatically added to the command list if the bots contains `RECURSIVE`, `ALERT` or `SCHEDULE` is enabled.

```
stop firstCommand // if firstCommand is a RECURSIVE command.
stop schedule firstCommand // to stop schedule command.
```

## Command type

* [DATA](https://github.com/usubram/slack-quick-bots-reference/blob/master/index.js#L27) - Simple data query.
* [RECURSIVE](https://github.com/usubram/slack-quick-bots-reference/blob/master/index.js#L40) - Simple data query bound to a timer.
* [Alert](https://github.com/usubram/slack-quick-bots-reference/blob/master/index.js#L81) - Run a peak/dip algorithm on a dataset and notifies channels/users bases on the threshold set in realtime.

## [Response type](https://github.com/usubram/slack-quick-bots-reference/blob/master/index.js#L100)

Library support wide range of response type. You can stream file of any type for a DATA command. The below sample is to generate a graph in realtime. Make sure you have gnuplot for graph.

```javascript
responseType: {
  type: 'png',
  ylabel: 'errors',
  xlabel: 'title errors',
  timeUnit: 'm',
  title: 'Log data',
  logscale: false,
  style: 'lines',
  exec: { encoding: 'utf16' }
}
```

## Input validation

```javascript
  allowedParam: ['param1', 'param2'], // array of inputs to accept.
  lowerLimit: 0,
  upperLimit: 100,
```

## [Custom webhooks](https://github.com/usubram/slack-quick-bots-reference/blob/master/index.js#L139-L145)

Supports setting up custom webhooks. Below configuration sets up a http server to serve webhook request. You should also add `webHook: true` at bot level config to make webhook available for bots. Custom webhook can be used to trigger long running operation and at the completion of the operation the hookUrl can be used to notify the user who triggered the operation.

```javascript
server: {
  host: 'http://custombothostname',
  port: 9090,
  webHook: true
}
```

```javascript
data: function(input, options, callback) {
  // options.hookUrl - http://custombothostname:9090//hook/U2U9RBV8R/69b773b0-a110-47cc-987d-48756d86a5ab.
  callback({
    data: 'message to respond for command goes here'
  });
}
```

## Access control

```javascript
  {
     bot: [{
       botCommand: {
         firstCommand: {
           allowedUsers: ['slackUsername'] // firstCommand work only for slack user with id 'slackUsername'.
         }
       }
     }],
     blockDirectMessage: false, // block direct message to the bot.
  }
```

## Testing bots

```javascript
  const onMessageSpy = sinon.spy((response) => {
    setTimeout(() => {
      expect(response.message).to.equal('Hello 1');
      done();
    }, 1);
  });

  testBots.start().then((botEvt) => {

    botEvt[0].on('connect', () => {
      botEvt[0].injectMessage({
        text: 'ping 1',
        channel: 'D1234567'
      });
    });

    botEvt[0].on('message', onMessageSpy);
  });
```

## License
Copyright (c) 2017 Umashankar Subramanian  
Licensed under the MIT license.

[npm-badge]: https://badge.fury.io/js/slack-quick-bots.svg
[npm-url]: https://badge.fury.io/js/slack-quick-bots
[travis-badge]: https://api.travis-ci.org/usubram/slack-quick-bots.svg
[travis-url]: https://travis-ci.org/usubram/slack-quick-bots
[daviddm-image]: https://david-dm.org/usubram/slack-quick-bots.svg
[daviddm-url]: https://david-dm.org/usubram/slack-quick-bots
