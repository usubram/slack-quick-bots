'use strict';

const _ = require('lodash');
const uuid = require('uuid');

const botLogger = require('../../../lib/utils/logger');
const SlackBot = require('../../../lib/index');
const config = require('../../../test/mock');
const responseHandler = require('../../../lib/bot/response-handler');
const message = require('../../../lib/command/message');
const storage = require('../../../lib/storage/storage');
const apiRequest = require('../../../lib/slack-api/api-request');

botLogger.setLogger();

describe.only('/bot', function () {
  describe('direct message', function () {
    let testBots;
    let errorContext;
    let slackMessage;
    let messageParser;
    let messageOptions;

    beforeEach(function () {
      testBots = new SlackBot(config.singleBot, {
        isMock: true,
      });
      jest.spyOn(storage, 'updateEvents').mockResolvedValue({});
      jest.spyOn(apiRequest, 'fetch').mockResolvedValue({
        members: [],
        channels: [],
      });
      errorContext = {
        error: true,
      };
      slackMessage = {
        id: uuid.v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T45',
        text: 'ping 1',
        team: 'T0GGDKVDE',
      };
      messageOptions = {
        name: 'testbot1',
        id: 'U1234567',
        eId: 'U1234567',
        isDirectMessage: true,
      };
      messageParser = message.parse(
        _.map(_.keys(_.get(config, 'singleBot.bots.0.botCommand')), _.toUpper),
        messageOptions
      );
    });

    afterEach(function () {
      testBots.shutdown();
    });

    it('Should response with the expected response', function (done) {
      const onMessageSpy = jest.fn((response) => {
        expect(response.message).toEqual('Hello 1');
        done();
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });

    it('Should respond with empty message', function (done) {
      slackMessage.text = '';
      errorContext.parsedMessage = messageParser(slackMessage);
      const errorMessage = responseHandler.generateErrorTemplate(
        'testbot1',
        testBots.bots[0].config.botCommand,
        errorContext
      );

      const onMessageSpy = jest.fn((response) => {
        expect(response.message).toEqual(errorMessage);
        done();
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });

    it('Should respond with uppercase command', function (done) {
      slackMessage.text = 'PING';
      const onMessageSpy = jest.fn((response) => {
        expect(response.message).toEqual('Hello 1');
        done();
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });

    it('Should respond with error message', function (done) {
      slackMessage.text = 'wrong command';
      errorContext.parsedMessage = messageParser(slackMessage);
      const errorMessage = responseHandler.generateErrorTemplate(
        'testbot1',
        testBots.bots[0].config.botCommand,
        errorContext
      );

      const onMessageSpy = jest.fn((response) => {
        expect(response.message).toEqual(errorMessage);
        done();
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });
  });

  describe('channel message', function () {
    let testBots;
    let errorContext;
    let slackMessage;
    let messageParser;
    let messageOptions;

    beforeEach(function () {
      testBots = new SlackBot(config.singleBot, {
        isMock: true,
      });
      jest.spyOn(apiRequest, 'fetch').mockResolvedValue({
        members: [],
        channels: [],
      });
      errorContext = {
        error: true,
      };
      slackMessage = {
        id: uuid.v4(),
        type: 'message',
        channel: 'C0GL06JD8',
        user: 'U0GG92T45',
        text: 'testbot1 ping 1',
        team: 'T0GGDKVDE',
      };
      messageOptions = {
        name: 'testbot1',
        id: 'U1234567',
        isDirectMessage: true,
      };
      messageParser = message.parse(
        _.map(_.keys(_.get(config, 'singleBot.bots.0.botCommand')), _.toUpper),
        messageOptions
      );
    });

    afterEach(function () {
      testBots.shutdown();
    });

    it('Should call dispatchMessage with correct arguments', function (done) {
      const onMessageSpy = jest.fn((response) => {
        expect(response.message).toEqual('Hello 1');
        done();
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });

    it('Should call dispatchMessage with botname and command without param', function (done) {
      slackMessage.text = 'testbot1 ping';
      const onMessageSpy = jest.fn((response) => {
        expect(response.message).toEqual('Hello 1');
        done();
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });

    it('Should not call dispatchMessage', function (done) {
      slackMessage.text = 'hello';
      const onMessageSpy = jest.fn();
      const onConnectSpy = jest.fn(() => {
        expect(onConnectSpy).toHaveBeenCalledTimes(1);
        expect(onMessageSpy).toHaveBeenCalledTimes(0);
        done();
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('connect', onConnectSpy);
        botEvt[0].on('message', onMessageSpy);
      });
    });

    it('Should not call dispatchMessage without botname', function (done) {
      slackMessage.text = 'ping 1';
      const onMessageSpy = jest.fn();
      const onConnectSpy = jest.fn(() => {
        expect(onConnectSpy).toHaveBeenCalledTimes(1);
        expect(onMessageSpy).toHaveBeenCalledTimes(0);
        done();
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('connect', onConnectSpy);
        botEvt[0].on('message', onMessageSpy);
      });
    });

    it(
      'Should show help message for message starting with' +
        'botname and wrong command',
      function (done) {
        slackMessage.text = 'testbot1 wrong command';
        errorContext.parsedMessage = messageParser(slackMessage);

        const errorMessage = responseHandler.generateErrorTemplate(
          'testbot1',
          testBots.bots[0].config.botCommand,
          errorContext
        );

        const onMessageSpy = jest.fn((response) => {
          expect(response.message).toEqual(errorMessage);
          done();
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      }
    );
  });
});
