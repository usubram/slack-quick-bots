'use strict';

const botLogger = require('../../lib/utils/logger');
const SlackBot = require('../../lib/index');
const config = require('../../test/mock');
const apiRequest = require('../../lib/slack-api/api-request');

botLogger.setLogger();

describe.only('SlackBot test', function () {
  describe('single bot', function () {
    let testBots;

    beforeEach(function () {
      testBots = new SlackBot(config.singleBot, {
        isMock: true,
      });
      jest.spyOn(apiRequest, 'fetch').mockReturnValue({
        members: [],
        channels: [],
      });
    });

    describe('Should instantiate slackbots correctly', function () {
      it('Should contain all the basic config', function () {
        expect(testBots.config.slack).toBeTruthy();
        expect(testBots.config.bots).toBeTruthy();
      });

      it('Should be able send and receive message', function (done) {
        const onMessageSpy = jest.fn((response) => {
          expect(response.message).toEqual('Hello 1');
          done();
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage({
              text: 'ping',
              channel: 'D1234567',
            });
          });

          botEvt[0].on('message', onMessageSpy);
        });
      });
    });
  });

  describe('multiple bot', function () {
    let testBots;

    beforeEach(function () {
      testBots = new SlackBot(config.multipleBot, {
        isMock: true,
      });
      jest.spyOn(apiRequest, 'fetch').mockReturnValue({
        members: [],
        channels: [],
      });
    });

    describe('Should instantiate slackbots correctly', function () {
      it('Should contain all the basic config', function () {
        expect(testBots.config.slack).toBeTruthy();
        expect(testBots.config.bots).toBeTruthy();
      });

      it('Should be able to send and receive message for all bots', function (done) {
        const onMessageSpy = jest.fn((response) => {
          expect(response.message).toEqual('Hello 1');
        });

        const onMessageSpy1 = jest.fn((response) => {
          expect(response.message).toEqual('Hello 2');
          done();
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage({
              text: 'ping 1',
              channel: 'D1234567',
            });
          });

          botEvt[0].on('message', onMessageSpy);

          botEvt[1].on('connect', () => {
            botEvt[1].injectMessage({
              text: 'ping 2',
              channel: 'D1234567',
            });
          });

          botEvt[1].on('message', onMessageSpy1);
        });
      });
    });
  });
});
