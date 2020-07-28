'use strict';

const _ = require('lodash');
const botLogger = require('../../../lib/utils/logger');
const uuid = require('uuid');

const SlackBot = require('../../../lib/index');
const socketServer = require('../../../lib/bot/socket-server');
const config = require('../../../test/mock');
const responseHandler = require('../../../lib/bot/response-handler');
const message = require('../../../lib/command/message');
const storage = require('../../../lib/storage/storage');
const apiRequest = require('../../../lib/slack-api/api-request');
const FakeTimers = require('@sinonjs/fake-timers');

botLogger.setLogger();

describe('/command', function () {
  let testBots;
  let errorContext;
  let slackMessage;
  let messageParser;
  let messageOptions;
  let clock;

  const initTestSetup = function (options) {
    jest.spyOn(storage, 'createEventDirectory').mockReturnValue({});
    testBots = new SlackBot(options.config, {
      isMock: true,
    });

    errorContext = _.merge(
      {},
      {
        error: true,
      },
      options.errorContext
    );

    slackMessage = _.merge(
      {},
      {
        id: uuid.v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T45',
        text: 'ping',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE',
      },
      options.slackMessage
    );

    messageOptions = _.merge(
      {},
      {
        name: 'testbot1',
        id: 'U1234567',
        isDirectMessage: true,
      },
      options.messageOptions
    );

    messageParser = message.parse(
      _.map(_.keys(_.get(testBots, 'bots.0.config.botCommand')), _.toUpper),
      messageOptions
    );
  };

  beforeEach(function () {
    jest.spyOn(storage, 'updateEvents').mockResolvedValue({});
    jest.spyOn(apiRequest, 'fetch').mockResolvedValue({
      members: [],
      channels: [],
    });
  });

  describe('validateCommand', function () {
    describe('isAllowedParamValid', function () {
      beforeEach(function () {
        initTestSetup({
          config: config.singleBotForAllowedParam,
        });
      });

      afterEach(function () {
        return socketServer.closeClient();
      });

      it('Should pass command vaidation with default value', function (done) {
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

      it('Should pass command vaidation with value 1', function (done) {
        slackMessage.text = 'ping 1';
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

      it('Should pass command vaidation with value 2', function (done) {
        slackMessage.text = 'ping 2';
        const onMessageSpy = jest.fn((response) => {
          expect(response.message).toEqual('Hello 2');
          done();
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it('Should fail command vaidation with value 3', function (done) {
        slackMessage.text = 'ping 3';
        delete errorContext.error;
        errorContext.noOfErrors = 1;
        errorContext.failedParams = [{ error: '3 is incorrect' }];
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

      it('Should fail command vaidation for two arguments', function (done) {
        slackMessage.text = 'pingsim 3 4';
        delete errorContext.error;
        errorContext.noOfErrors = 1;
        errorContext.failedParams = [{ error: '3 is incorrect' }];
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

      it('command vaidation for two regex arguments should succeed', function (done) {
        slackMessage.text = 'pingregex 1 6';
        const onMessageSpy = jest.fn((response) => {
          expect(response.message).toEqual('Hello 1,6');
          done();
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it('command vaidation correct for two regex arguments should succeed', function (done) {
        slackMessage.text = 'pingregexchk 1 1';
        const onMessageSpy = jest.fn((response) => {
          expect(response.message).toEqual('Hello 1,1');
          done();
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it(
        'command vaidation correct for two regex arguments' +
          'nested array schema should succeed',
        function (done) {
          slackMessage.text = 'pingregexchk1 1 one';
          const onMessageSpy = jest.fn((response) => {
            expect(response.message).toEqual('Hello 1,one');
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

      it('command vaidation message for general help', function (done) {
        slackMessage.text = 'help';
        delete errorContext.error;
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

      it('command vaidation message for context help', function (done) {
        slackMessage.text = 'pingregexchk help';
        delete errorContext.error;
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

      it('command vaidation for two regex args should fail with error', function (done) {
        slackMessage.text = 'pingregex 1 10';
        delete errorContext.error;
        errorContext = {
          sampleParams: [1, 3],
          noOfErrors: 1,
          failedParams: [
            {
              error: '10 is incorrect',
            },
          ],
        };
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

      it('Success command vaidation for two arguments', function (done) {
        slackMessage.text = 'pingarg 2 4';

        const onMessageSpy = jest.fn((response) => {
          expect(response.message).toEqual('Hello 2,4');
          done();
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it(
        'Success command vaidation for two arguments ' +
          'should recommend the closet one',
        function (done) {
          slackMessage.text = 'pingargrecomend second 2 3';
          delete errorContext.error;
          errorContext.failedParams = [
            {
              error: '2 is incorrect',
            },
          ];
          errorContext.sampleParams = [1, 3];
          errorContext.noOfErrors = 1;
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

      it('Should show param specific error message for validation error', function (done) {
        slackMessage.text = 'pingarg hello 4';
        delete errorContext.error;
        errorContext.failedParams = [
          {
            error: 'HELLO is incorrect',
          },
          {
            error: '4 is incorrect',
          },
        ];
        errorContext.sampleParams = [1, 3];
        errorContext.noOfErrors = 2;
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

      it('Should show param specific error message for two validation error', function (done) {
        slackMessage.text = 'pingarg hello 5';
        delete errorContext.error;
        errorContext.failedParams = [
          {
            error: 'HELLO is incorrect',
          },
          {
            error: '5 is incorrect',
          },
        ];

        errorContext.sampleParams = [1, 3];
        errorContext.noOfErrors = 2;
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

    describe('isAllowedParamValid - data func returns Promise', function () {
      beforeEach(function () {
        initTestSetup({
          config: config.dataPromise.singleBotForAllowedParam,
        });
      });

      afterEach(function () {
        return socketServer.closeClient();
      });

      it('Should pass command vaidation with default value', function (done) {
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

      it('Should pass command vaidation with value 1', function (done) {
        slackMessage.text = 'ping 1';
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

      it('Should pass command vaidation with value 2', function (done) {
        slackMessage.text = 'ping 2';
        const onMessageSpy = jest.fn((response) => {
          expect(response.message).toEqual('Hello 2');
          done();
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it('Should fail command vaidation with value 3', function (done) {
        slackMessage.text = 'ping 3';
        delete errorContext.error;
        errorContext.noOfErrors = 1;
        errorContext.failedParams = [{ error: '3 is incorrect' }];
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

      it('Should fail command vaidation for two arguments', function (done) {
        slackMessage.text = 'pingsim 3 4';
        delete errorContext.error;
        errorContext.noOfErrors = 1;
        errorContext.failedParams = [{ error: '3 is incorrect' }];
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

      it('command vaidation for two regex arguments should succeed', function (done) {
        slackMessage.text = 'pingregex 1 6';
        const onMessageSpy = jest.fn((response) => {
          expect(response.message).toEqual('Hello 1,6');
          done();
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it('command vaidation correct for two regex arguments should succeed', function (done) {
        slackMessage.text = 'pingregexchk 1 1';
        const onMessageSpy = jest.fn((response) => {
          expect(response.message).toEqual('Hello 1,1');
          done();
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it(
        'command vaidation correct for two regex arguments' +
          'nested array schema should succeed',
        function (done) {
          slackMessage.text = 'pingregexchk1 1 one';
          const onMessageSpy = jest.fn((response) => {
            expect(response.message).toEqual('Hello 1,one');
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

      it('command vaidation message for general help', function (done) {
        slackMessage.text = 'help';
        delete errorContext.error;
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

      it('command vaidation message for context help', function (done) {
        slackMessage.text = 'pingregexchk help';
        delete errorContext.error;
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

      it('command vaidation for two regex args should fail with error', function (done) {
        slackMessage.text = 'pingregex 1 10';
        delete errorContext.error;
        errorContext = {
          sampleParams: [1, 3],
          noOfErrors: 1,
          failedParams: [
            {
              error: '10 is incorrect',
            },
          ],
        };
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

      it('Success command vaidation for two arguments', function (done) {
        slackMessage.text = 'pingarg 2 4';

        const onMessageSpy = jest.fn((response) => {
          expect(response.message).toEqual('Hello 2,4');
          done();
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it(
        'Success command vaidation for two arguments ' +
          'should recommend the closet one',
        function (done) {
          slackMessage.text = 'pingargrecomend second 2 3';
          delete errorContext.error;
          errorContext.failedParams = [
            {
              error: '2 is incorrect',
            },
          ];
          errorContext.sampleParams = [1, 3];
          errorContext.noOfErrors = 1;
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

      it('Should show param specific error message for validation error', function (done) {
        slackMessage.text = 'pingarg hello 4';
        delete errorContext.error;
        errorContext.failedParams = [
          {
            error: 'HELLO is incorrect',
          },
          {
            error: '4 is incorrect',
          },
        ];
        errorContext.sampleParams = [1, 3];
        errorContext.noOfErrors = 2;
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

      it('Should show param specific error message for two validation error', function (done) {
        slackMessage.text = 'pingarg hello 5';
        delete errorContext.error;
        errorContext.failedParams = [
          {
            error: 'HELLO is incorrect',
          },
          {
            error: '5 is incorrect',
          },
        ];

        errorContext.sampleParams = [1, 3];
        errorContext.noOfErrors = 2;
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
  });

  describe('isCommandAllowed', function () {
    beforeEach(function () {
      initTestSetup({
        config: config.isCommandAllowed,
        slackMessage: {
          text: 'ping 1',
          channel: 'D0GL06JD7',
          user: 'U0GG92T46',
        },
      });
    });

    afterEach(function () {
      return socketServer.closeClient();
    });

    it('Should block user and respond error', function (done) {
      delete errorContext.error;
      errorContext.restrictedUser = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      errorContext.users = testBots.bots[0].config.allowedUsers;
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

    it('Should respond to messages for allowed user', function (done) {
      slackMessage.user = 'U0GG92T45';

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

    it('Should error out if the user is not found', function (done) {
      slackMessage.user = 'U0GG92T47';
      delete errorContext.error;
      errorContext.restrictedUser = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      errorContext.users = testBots.bots[0].config.allowedUsers;
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

  describe('isCommandAllowed - data function returns Promise', function () {
    beforeEach(function () {
      initTestSetup({
        config: config.dataPromise.isCommandAllowed,
        slackMessage: {
          text: 'ping 1',
          channel: 'D0GL06JD7',
          user: 'U0GG92T46',
        },
      });
    });

    afterEach(function () {
      return socketServer.closeClient();
    });

    it('Should block user and respond error', function (done) {
      delete errorContext.error;
      errorContext.restrictedUser = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      errorContext.users = testBots.bots[0].config.allowedUsers;
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

    it('Should respond to messages for allowed user', function (done) {
      slackMessage.user = 'U0GG92T45';

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

    it('Should error out if the user is not found', function (done) {
      slackMessage.user = 'U0GG92T47';
      delete errorContext.error;
      errorContext.restrictedUser = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      errorContext.users = testBots.bots[0].config.allowedUsers;
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

  describe('isAllowedChannel', function () {
    beforeEach(function () {
      initTestSetup({
        config: config.isAllowedChannel,
        slackMessage: {
          text: 'ping 1',
          channel: 'D0GL06JD7',
          user: 'U0GG92T46',
        },
      });
    });

    afterEach(function () {
      return socketServer.closeClient();
    });

    it('Should block message for not allowed channels', function (done) {
      delete errorContext.error;
      errorContext.restrictedChannel = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      errorContext.users = testBots.bots[0].config.allowedUsers;
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

    it('Should not block message for allowed channels', function (done) {
      slackMessage.channel = 'C0GG92T45';
      slackMessage.text = '<@U1234567> ping 1';

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
  });

  describe('isAllowedChannel - data function returns Promise', function () {
    beforeEach(function () {
      initTestSetup({
        config: config.isAllowedChannel,
        slackMessage: {
          text: 'ping 1',
          channel: 'D0GL06JD7',
          user: 'U0GG92T46',
        },
      });
    });

    afterEach(function () {
      return socketServer.closeClient();
    });

    it('Should block message for not allowed channels', function (done) {
      delete errorContext.error;
      errorContext.restrictedChannel = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      errorContext.users = testBots.bots[0].config.allowedUsers;
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

    it('Should not block message for allowed channels', function (done) {
      slackMessage.channel = 'C0GG92T45';
      slackMessage.text = '<@U1234567> ping 1';

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
  });

  describe('blockDirectMessage', function () {
    beforeEach(function () {
      initTestSetup({
        config: config.blockDirectMessage,
        slackMessage: {
          channel: 'D0GL06JD7',
          user: 'U0GG92T46',
          text: 'ping 1',
        },
      });
    });

    afterEach(function () {
      return socketServer.closeClient();
    });

    it('Should respond with blocked message on DM', function (done) {
      delete errorContext.error;
      errorContext.botDirectMessageError = true;

      const errorMessage = responseHandler.generateBotResponseTemplate(
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

    it('Should respond with blocked message on private group', function (done) {
      slackMessage.channel = 'G0GL06JD7';
      slackMessage.text = 'testbot1 ping 1';
      delete errorContext.error;
      errorContext.botDirectMessageError = true;
      const errorMessage = responseHandler.generateBotResponseTemplate(
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

    it(
      'Should respond with blocked message on ' +
        ' private group with custom message',
      function (done) {
        slackMessage.channel = 'G0GL06JD7';
        slackMessage.text = 'testbot1 ping 1';
        delete errorContext.error;
        errorContext.botDirectMessageError = true;
        const errorMessage = responseHandler.generateBotResponseTemplate(
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

    it(
      'Should not respond for non-bot message' + ' in private group',
      function (done) {
        slackMessage.channel = 'G0GL06JD7';
        slackMessage.text = 'ping 1';
        const onMessageSpy = jest.fn();

        setTimeout(() => {
          expect(onMessageSpy).toHaveBeenCalledTimes(0);
          done();
        }, 100);

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      }
    );

    it('Should respond to messages in public channel', function (done) {
      slackMessage.channel = 'C0GL06JD7';
      slackMessage.text = 'testbot1 ping 1';

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
  });

  describe('blockDirectMessage - data function returns Promise', function () {
    beforeEach(function () {
      initTestSetup({
        config: config.dataPromise.blockDirectMessage,
        slackMessage: {
          channel: 'D0GL06JD7',
          user: 'U0GG92T46',
          text: 'ping 1',
        },
      });
    });

    afterEach(function () {
      return socketServer.closeClient();
    });

    it('Should respond with blocked message on DM', function (done) {
      delete errorContext.error;
      errorContext.botDirectMessageError = true;

      const errorMessage = responseHandler.generateBotResponseTemplate(
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

    it('Should respond with blocked message on private group', function (done) {
      slackMessage.channel = 'G0GL06JD7';
      slackMessage.text = 'testbot1 ping 1';
      delete errorContext.error;
      errorContext.botDirectMessageError = true;
      const errorMessage = responseHandler.generateBotResponseTemplate(
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

    it(
      'Should respond with blocked message on ' +
        'private group with custom message',
      function (done) {
        slackMessage.channel = 'G0GL06JD7';
        slackMessage.text = 'testbot1 ping 1';
        delete errorContext.error;
        errorContext.botDirectMessageError = true;
        const errorMessage = responseHandler.generateBotResponseTemplate(
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

    it(
      'Should not respond for non-bot message' + ' in private group',
      function (done) {
        slackMessage.channel = 'G0GL06JD7';
        slackMessage.text = 'ping 1';
        const onMessageSpy = jest.fn();

        setTimeout(() => {
          expect(onMessageSpy).toHaveBeenCalledTimes(0);
          done();
        }, 100);

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      }
    );

    it('Should respond to messages in public channel', function (done) {
      slackMessage.channel = 'C0GL06JD7';
      slackMessage.text = 'testbot1 ping 1';

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
  });

  describe('blockDirectCustomMessage', function () {
    let testBots;
    let errorContext;
    let slackMessage;

    beforeEach(function () {
      testBots = new SlackBot(config.blockDirectCustomMessage, {
        isMock: true,
      });
      errorContext = {
        error: true,
      };
      slackMessage = {
        id: uuid.v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T46',
        text: 'ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE',
      };
    });

    afterEach(function () {
      return socketServer.closeClient();
    });

    it(
      'Should respond with blocked message on' +
        'private group with custom message',
      function (done) {
        slackMessage.channel = 'G0GL06JD7';
        slackMessage.text = 'testbot1 ping 1';
        delete errorContext.error;
        errorContext.botDirectMessageError = true;
        errorContext.message = 'Hi <@U0GG92T46> custom message';
        const errorMessage = responseHandler.generateBotResponseTemplate(
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

  describe('blockDirectCustomMessage - data func returns Promise', function () {
    let testBots;
    let errorContext;
    let slackMessage;

    beforeEach(function () {
      jest.spyOn(storage, 'createEventDirectory').mockReturnValue({});
      testBots = new SlackBot(config.dataPromise.blockDirectCustomMessage, {
        isMock: true,
      });
      errorContext = {
        error: true,
      };
      slackMessage = {
        id: uuid.v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T46',
        text: 'ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE',
      };
    });

    afterEach(function () {
      return socketServer.closeClient();
    });

    it(
      'Should respond with blocked message on' +
        'private group with custom message',
      function (done) {
        slackMessage.channel = 'G0GL06JD7';
        slackMessage.text = 'testbot1 ping 1';
        delete errorContext.error;
        errorContext.botDirectMessageError = true;
        errorContext.message = 'Hi <@U0GG92T46> custom message';
        const errorMessage = responseHandler.generateBotResponseTemplate(
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

  describe('Test command types', function () {
    beforeEach(function () {
      initTestSetup({
        config: config.commandTypeBots,
        slackMessage: {
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'ping 1',
        },
      });
      clock = FakeTimers.install();
    });

    afterEach(function () {
      clock.uninstall();

      return socketServer.closeClient();
    });

    it('Should call getData for data command', function (done) {
      slackMessage.text = 'ping';

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

    it('Should respond with redo response', async (done) => {
      slackMessage.text = 'flowit redo';
      delete errorContext.error;
      errorContext.noflow = true;
      const errorMessage = responseHandler.generateBotResponseTemplate(
        errorContext
      );

      const onMessageSpy = jest.fn((response) => {
        expect(response.message).toEqual(errorMessage);
        done();
      });

      const testbot = await testBots.start();
      testbot[0].on('connect', () => {
        testbot[0].injectMessage(slackMessage);
      });
      testbot[0].on('message', onMessageSpy);
    });

    it('Should run all flow command steps', async (done) => {
      slackMessage.text = 'flowit user 123';

      const onMessageSpy = jest.fn((response) => {
        if (onMessageSpy.mock.calls.length === 1) {
          expect(response.message).toContain('*1*');
          slackMessage.text = 'flowit 1';
          testbot[0].injectMessage(slackMessage);
        }
        if (onMessageSpy.mock.calls.length === 2) {
          slackMessage.text = 'flowit yes';
          expect(response.message).toContain('selected 1');
          done();
        }
      });

      const testbot = await testBots.start();
      testbot[0].on('connect', () => {
        testbot[0].injectMessage(slackMessage);
      });
      testbot[0].on('message', onMessageSpy);
    });

    it('Should call setUpRecursiveTask for recursive command', function (done) {
      slackMessage.text = 'auto';

      const onMessageSpy = jest.fn((response) => {
        if (response.message === 'Hello 1') {
          done();
        }
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });

    it('Should call killTask for kill command', function (done) {
      slackMessage.text = 'stop';
      delete errorContext.error;
      errorContext.noOfErrors = 1;
      errorContext.failedParams = [
        { error: 'err!! you are missing ' + 'another argument' },
      ];
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

    it('Should call alertTask for alert command', function (done) {
      slackMessage.text = 'alert';
      delete errorContext.error;
      errorContext.noOfErrors = 1;
      errorContext.failedParams = [
        { error: 'err!! you are missing ' + 'another argument' },
      ];
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

  describe('Test command types - data function returns Promise', function () {
    beforeEach(function () {
      initTestSetup({
        config: config.dataPromise.commandTypeBots,
        slackMessage: {
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'ping 1',
        },
      });
    });

    afterEach(function () {
      return socketServer.closeClient();
    });

    it('Should call getData for data command', function (done) {
      slackMessage.text = 'ping';

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

    it('Should call setUpRecursiveTask for recursive command', function (done) {
      slackMessage.text = 'auto';

      const onMessageSpy = jest.fn((response) => {
        if (response.message === 'Hello 1') {
          done();
        }
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });

    it('Should call killTask for kill command', function (done) {
      slackMessage.text = 'stop';
      delete errorContext.error;
      errorContext.noOfErrors = 1;
      errorContext.failedParams = [
        { error: 'err!! you are missing ' + 'another argument' },
      ];
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

    it('Should call alertTask for alert command', function (done) {
      slackMessage.text = 'alert';
      delete errorContext.error;
      errorContext.noOfErrors = 1;
      errorContext.failedParams = [
        { error: 'err!! you are missing ' + 'another argument' },
      ];
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

  describe('Schedule - command tools', function () {
    beforeEach(function () {
      jest.spyOn(storage, 'getEvents').mockResolvedValue({
        events: {},
        schedule: config.schedule,
      });

      initTestSetup({
        config: config.dataPromise.commandTypeBots,
      });
      clock = FakeTimers.install();
    });

    afterEach(function () {
      clock.uninstall();

      return socketServer.closeClient();
    });

    it('Should call schedule command', function (done) {
      const onMessageSpy = jest.fn((response) => {
        if (onMessageSpy.mock.calls.length === 1) {
          expect(response.message).toEqual('Hello 1');
          clock.tick(60000);
        }
        if (onMessageSpy.mock.calls.length === 2) {
          expect(response.message).toEqual('Hello 1');
          done();
        }
      });
      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          clock.tick(60000);
        });
      });
    });
  });
});
