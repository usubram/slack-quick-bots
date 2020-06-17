'use strict';

const _ = require('lodash');
const config = require('../mock');
const SlackBot = require('./../../lib/index');
const socketServer = require('./../../lib/bot/socket-server');
const apiRequest = require('./../../lib/slack-api/api-request');
const FakeTimers = require('@sinonjs/fake-timers');
const { Connector } = require('./../../lib/bot/connector');

console.log('Connector.prototype', Connector.prototype.connect);
describe('/connector', function () {
  let slackBot;
  let botConfig;

  beforeEach(() => {
    botConfig = _.cloneDeep(config.singleBot);
    jest.spyOn(Connector.prototype, 'connect');
    jest.spyOn(apiRequest, 'fetch').mockReturnValue({
      members: [],
      channels: [],
    });
  });

  afterEach(() => {
    return socketServer.closeClient();
  });

  it('Should connect to socker server at first attempt and respond', async () => {
    slackBot = new SlackBot(botConfig, {
      isMock: true,
    });

    const testbot = await slackBot.start();
    testbot[0].on('connect', () => {
      testbot[0].injectMessage({
        text: 'ping 1',
        channel: 'D1234567',
      });
    });
    const response = await new Promise(function (resolve) {
      testbot[0].on('message', resolve);
    });

    expect(response.message).toEqual('Hello 1');
    expect(Connector.prototype.connect).toHaveBeenCalledTimes(1);
  });

  it('Should connect to socker server after 3rd attempt and respond', async () => {
    _.set(botConfig, 'bots[0].mock.retryAttempt', 2);

    const clock = FakeTimers.install();
    slackBot = new SlackBot(botConfig, {
      isMock: true,
    });

    const testbot = await slackBot.start();
    clock.tick(2001);

    testbot[0].on('connect', () => {
      testbot[0].injectMessage({
        text: 'ping 1',
        channel: 'D1234567',
      });
    });

    const response = await new Promise(function (resolve) {
      testbot[0].on('message', resolve);
    });

    expect(response.message).toEqual('Hello 1');
    expect(Connector.prototype.connect).toHaveBeenCalledTimes(2);
    clock.uninstall();
  });

  it('Should fail on auth error and should not retry', async () => {
    _.set(botConfig, 'bots[0].mock.retryAttempt', 2);
    _.set(botConfig, 'bots[0].mock', {
      error: 'invalid_auth',
    });

    slackBot = new SlackBot(botConfig, {
      isMock: true,
    });

    await slackBot.start();

    expect(Connector.prototype.connect).toHaveBeenCalledTimes(1);
  });

  it('Should shutdown bot successfully', async () => {
    slackBot = new SlackBot(botConfig, {
      isMock: true,
    });

    const clock = FakeTimers.install();
    const testbot = await slackBot.start();
    clock.tick(2001);

    testbot[0].on('connect', () => {
      testbot[0].shutdown();
    });

    return await new Promise(function (resolve) {
      testbot[0].on('shutdown', resolve);
    });
  });

  it('Should close bot successfully', async () => {
    slackBot = new SlackBot(botConfig, {
      isMock: true,
    });
    const clock = FakeTimers.install();
    let count = 2;

    const testbot = await slackBot.start();

    testbot[0].on('connect', () => {
      --count;
      testbot[0].close();

      if (count === 0) {
        testbot[0].shutdown();
      }
    });

    testbot[0].on('close', () => {
      clock.tick(3000);
    });

    testbot[0].on('shutdown', () => {
      clock.uninstall();
    });
  });
});
