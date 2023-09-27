'use strict';

import { cloneDeep, set } from 'lodash-es';
import fixtures from '../mock/index.js';
import SlackBot from './../../lib/index.js';
import apiRequest from './../../lib/slack-api/api-request.js';
import { install } from '@sinonjs/fake-timers';
import { Connector } from './../../lib/bot/connector.js';

describe('/connector', function () {
  let slackBot;
  let botConfig;

  beforeEach(() => {
    botConfig = cloneDeep(fixtures.singleBot);
    jest.spyOn(Connector.prototype, 'connect');
    jest.spyOn(apiRequest, 'fetch').mockReturnValue({
      members: [],
      channels: [],
    });
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
    const response = await new Promise((resolve) => {
      testbot[0].on('message', resolve);
    });

    expect(response.message).toEqual('Hello 1');
    expect(Connector.prototype.connect).toHaveBeenCalledTimes(1);
  });

  it('Should connect to socker server after 3rd attempt and respond', async () => {
    set(botConfig, 'bots[0].mock.retryAttempt', 2);

    const clock = install();
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
    set(botConfig, 'bots[0].mock.retryAttempt', 2);
    set(botConfig, 'bots[0].mock', {
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

    const clock = install();
    const testbot = await slackBot.start();
    clock.tick(2001);

    testbot[0].on('connect', () => {
      testbot[0].shutdown();
    });

    return await new Promise(function (resolve) {
      testbot[0].on('shutdown', resolve);
      clock.uninstall();
    });
  });

  it('Should close bot successfully', async () => {
    slackBot = new SlackBot(botConfig, {
      isMock: true,
    });
    const clock = install();
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
