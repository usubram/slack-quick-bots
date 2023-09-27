'use strict';

import { merge, map, get, toUpper } from 'lodash-es';
import { v4 } from 'uuid';

import SlackBot from '../../../lib/index.js';
import fixtures from '../../../test/mock/index.js';
import {
  generateErrorTemplate,
  generateBotResponseTemplate,
} from '../../../lib/bot/response-handler.js';
import { parse } from '../../../lib/command/message.js';
import { Storage } from '../../../lib/storage/storage.js';
import apiRequest from '../../../lib/slack-api/api-request.js';
import { install } from '@sinonjs/fake-timers';

describe('/command', function () {
  let testBots;
  let errorContext;
  let slackMessage;
  let messageParser;
  let messageOptions;
  let clock;

  const initTestSetup = function (options) {
    jest.spyOn(Storage, 'createEventDirectory').mockReturnValue({});
    testBots = new SlackBot(options.config, {
      isMock: true,
    });

    errorContext = merge(
      {},
      {
        error: true,
      },
      options.errorContext
    );

    slackMessage = merge(
      {},
      {
        id: v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T45',
        text: 'ping',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE',
      },
      options.slackMessage
    );

    messageOptions = merge(
      {},
      {
        name: 'testbot1',
        id: 'U1234567',
        isDirectMessage: true,
      },
      options.messageOptions
    );

    messageParser = parse(
      map(get(testBots, 'bots.0.config.botCommand'), (command, key) => {
        return {
          command: toUpper(key),
          alias: command.alias ? (command.alias || []).map(toUpper) : [],
        };
      }),
      messageOptions
    );
  };

  beforeEach(function () {
    jest.spyOn(Storage, 'updateEvents').mockResolvedValue({});
    jest.spyOn(apiRequest, 'fetch').mockResolvedValue({
      members: [],
      channels: [],
    });
  });

  describe('validateCommand', function () {
    describe('isAllowedParamValid', function () {
      beforeEach(function () {
        initTestSetup({
          config: fixtures.singleBotForAllowedParam,
        });
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
        const errorMessage = generateErrorTemplate(
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
        const errorMessage = generateErrorTemplate(
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
        const errorMessage = generateErrorTemplate(
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
        const errorMessage = generateErrorTemplate(
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

        const errorMessage = generateErrorTemplate(
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
          const errorMessage = generateErrorTemplate(
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
        const errorMessage = generateErrorTemplate(
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
        const errorMessage = generateErrorTemplate(
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
          config: fixtures.singleBotForAllowedParam,
        });
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
        const errorMessage = generateErrorTemplate(
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
        const errorMessage = generateErrorTemplate(
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
        const errorMessage = generateErrorTemplate(
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
        const errorMessage = generateErrorTemplate(
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

        const errorMessage = generateErrorTemplate(
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
          const errorMessage = generateErrorTemplate(
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
        const errorMessage = generateErrorTemplate(
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
        const errorMessage = generateErrorTemplate(
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
        config: fixtures.isCommandAllowed,
        slackMessage: {
          text: 'ping 1',
          channel: 'D0GL06JD7',
          user: 'U0GG92T46',
        },
      });
    });

    it('Should block user and respond error', function (done) {
      delete errorContext.error;
      errorContext.restrictedUser = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      errorContext.users = testBots.bots[0].config.allowedUsers;
      const errorMessage = generateErrorTemplate(
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
      const errorMessage = generateErrorTemplate(
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
        config: fixtures.isCommandAllowed,
        slackMessage: {
          text: 'ping 1',
          channel: 'D0GL06JD7',
          user: 'U0GG92T46',
        },
      });
    });

    it('Should block user and respond error', function (done) {
      delete errorContext.error;
      errorContext.restrictedUser = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      errorContext.users = testBots.bots[0].config.allowedUsers;
      const errorMessage = generateErrorTemplate(
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
      const errorMessage = generateErrorTemplate(
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
        config: fixtures.isAllowedChannel,
        slackMessage: {
          text: 'ping 1',
          channel: 'D0GL06JD7',
          user: 'U0GG92T46',
        },
      });
    });

    it('Should block message for not allowed channels', function (done) {
      delete errorContext.error;
      errorContext.restrictedChannel = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      errorContext.users = testBots.bots[0].config.allowedUsers;
      const errorMessage = generateErrorTemplate(
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
        config: fixtures.isAllowedChannel,
        slackMessage: {
          text: 'ping 1',
          channel: 'D0GL06JD7',
          user: 'U0GG92T46',
        },
      });
    });

    it('Should block message for not allowed channels', function (done) {
      delete errorContext.error;
      errorContext.restrictedChannel = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      errorContext.users = testBots.bots[0].config.allowedUsers;
      const errorMessage = generateErrorTemplate(
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
        config: fixtures.blockDirectMessage,
        slackMessage: {
          channel: 'D0GL06JD7',
          user: 'U0GG92T46',
          text: 'ping 1',
        },
      });
    });

    it('Should respond with blocked message on DM', function (done) {
      delete errorContext.error;
      errorContext.botDirectMessageError = true;

      const errorMessage = generateBotResponseTemplate(errorContext);

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
      const errorMessage = generateBotResponseTemplate(errorContext);

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
        const errorMessage = generateBotResponseTemplate(errorContext);

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
        config: fixtures.blockDirectMessage,
        slackMessage: {
          channel: 'D0GL06JD7',
          user: 'U0GG92T46',
          text: 'ping 1',
        },
      });
    });

    it('Should respond with blocked message on DM', function (done) {
      delete errorContext.error;
      errorContext.botDirectMessageError = true;

      const errorMessage = generateBotResponseTemplate(errorContext);

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
      const errorMessage = generateBotResponseTemplate(errorContext);

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
        const errorMessage = generateBotResponseTemplate(errorContext);

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
      testBots = new SlackBot(fixtures.blockDirectCustomMessage, {
        isMock: true,
      });
      errorContext = {
        error: true,
      };
      slackMessage = {
        id: v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T46',
        text: 'ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE',
      };
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
        const errorMessage = generateBotResponseTemplate(errorContext);

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
      jest.spyOn(Storage, 'createEventDirectory').mockReturnValue({});
      testBots = new SlackBot(fixtures.blockDirectCustomMessage, {
        isMock: true,
      });
      errorContext = {
        error: true,
      };
      slackMessage = {
        id: v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T46',
        text: 'ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE',
      };
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
        const errorMessage = generateBotResponseTemplate(errorContext);

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
        config: fixtures.commandTypeBots,
        slackMessage: {
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'ping 1',
        },
      });
      clock = install();
    });

    afterEach(function () {
      clock.uninstall();
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

    it('Should respond with redo response', function (done) {
      testBots.start().then((botEvt) => {
        slackMessage.text = 'flowit redo';
        delete errorContext.error;
        errorContext.noflow = true;
        const errorMessage = generateBotResponseTemplate(errorContext);
        const onMessageSpy = jest.fn((response) => {
          expect(response.message).toEqual(errorMessage);
          done();
        });
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });

    it('Should run all flow command steps', function (done) {
      testBots.start().then((botEvt) => {
        const onMessageSpy = jest.fn((response) => {
          if (onMessageSpy.mock.calls.length === 1) {
            expect(response.message).toContain('*1*');
            slackMessage.text = 'flowit 1';
            botEvt[0].injectMessage(slackMessage);
          }
          if (onMessageSpy.mock.calls.length === 2) {
            expect(response.message).toContain('selected 1');
            slackMessage.text = 'flowit yes';
            botEvt[0].injectMessage(slackMessage);
          }
          if (onMessageSpy.mock.calls.length === 3) {
            expect(response.message).toContain('Page out sent');
            done();
          }
        });
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          slackMessage.text = 'flowit user 123';
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

      const errorMessage = generateErrorTemplate(
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
      const errorMessage = generateErrorTemplate(
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
        config: fixtures.commandTypeBots,
        slackMessage: {
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'ping 1',
        },
      });
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

      const errorMessage = generateErrorTemplate(
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
      const errorMessage = generateErrorTemplate(
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
      jest.spyOn(Storage, 'getEvents').mockResolvedValue({
        events: {},
        schedule: fixtures.schedule,
      });

      initTestSetup({
        config: fixtures.commandTypeBots,
      });
      clock = install();
    });

    afterEach(function () {
      clock.uninstall();
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
