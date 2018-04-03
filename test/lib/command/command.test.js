'use strict';

const _ = require('lodash');
const botLogger = require('../../../lib/utils/logger');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;

const uuid = require('uuid');
const root = '../../../';

const SlackBot = require(root + 'lib/index');
const socketServer = require(root + '/lib/bot/socket-server');
const config = require(root + 'test/mock/config');
const responseHandler = require(root + 'lib/bot/response-handler');
const message = require(root + 'lib/command/message');
const storage = require(root + 'lib/storage/storage');
const apiRequest = require(root + 'lib/slack-api/api-request');

botLogger.setLogger();

describe('/command', function () {
  let sandbox;
  let testBots;
  let errorContext;
  let slackMessage;
  let messageParser;
  let messageOptions;

  const initTestSetup = function (options) {
    testBots = new SlackBot(options.config, {
      isMock: true,
    });

    errorContext = _.merge({}, {
      error: true,
    }, options.errorContext);

    slackMessage = _.merge({}, {
      id: uuid.v4(),
      type: 'message',
      channel: 'D0GL06JD7',
      user: 'U0GG92T45',
      text: 'ping',
      ts: '1453007224.000007',
      team: 'T0GGDKVDE',
    }, options.slackMessage);

    messageOptions = _.merge({}, {
      name: 'testbot1',
      id: 'U1234567',
      isDirectMessage: true,
    }, options.messageOptions);

    messageParser = message.parse(
      _.map(_.keys(_.get(testBots, 'bots.0.config.botCommand')),
        _.toUpper), messageOptions);
  };

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(storage, 'updateEvents').callsFake(() => {
      return Promise.resolve({});
    });
    sandbox.stub(apiRequest, 'fetch').callsFake(() => {
      return Promise.resolve({
        members: [],
        channels: [],
      });
    });
  });

  afterEach(function () {
    sandbox.restore();
    socketServer.closeClient();
  });

  describe('validateCommand', function () {
    describe('isAllowedParamValid', function () {
      beforeEach(function () {
        initTestSetup({
          config: config.singleBotForAllowedParam,
        });
      });

      it('Should pass command vaidation with default value', function (done) {
        const onMessageSpy = sandbox.spy((response) => {
          setTimeout(() => {
            expect(response.message).to.equal('Hello 1');
            done();
          }, 1);
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
        const onMessageSpy = sandbox.spy((response) => {
          setTimeout(() => {
            expect(response.message).to.equal('Hello 1');
            done();
          }, 1);
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
        const onMessageSpy = sandbox.spy((response) => {
          setTimeout(() => {
            expect(response.message).to.equal('Hello 2');
            done();
          }, 1);
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
        errorContext.param = true;
        errorContext.parsedMessage = messageParser(slackMessage);
        const errorMessage = responseHandler.generateErrorTemplate('testbot1',
          testBots.bots[0].config.botCommand, errorContext);

        const onMessageSpy = sandbox.spy((response) => {
          setTimeout(() => {
            expect(response.message).to.equal(errorMessage);
            done();
          }, 1);
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it('Should fail command vaidation for two arguments',
        function (done) {
          slackMessage.text = 'pingsim 3 4';
          delete errorContext.error;
          errorContext.mParams = true;
          errorContext.parsedMessage = messageParser(slackMessage);
          const errorMessage = responseHandler.generateErrorTemplate('testbot1',
            testBots.bots[0].config.botCommand, errorContext);

          const onMessageSpy = sandbox.spy((response) => {
            setTimeout(() => {
              expect(response.message).to.equal(errorMessage);
              done();
            }, 1);
          });

          testBots.start().then((botEvt) => {
            botEvt[0].on('message', onMessageSpy);

            botEvt[0].on('connect', () => {
              botEvt[0].injectMessage(slackMessage);
            });
          });
        });

      it('command vaidation for two regex arguments should succeed',
        function (done) {
          slackMessage.text = 'pingregex 1 6';
          const onMessageSpy = sandbox.spy((response) => {
            setTimeout(() => {
              expect(response.message).to.equal('Hello 1,6');
              done();
            }, 1);
          });

          testBots.start().then((botEvt) => {
            botEvt[0].on('message', onMessageSpy);

            botEvt[0].on('connect', () => {
              botEvt[0].injectMessage(slackMessage);
            });
          });
        });

      it('command vaidation for two regex args should fail with error',
        function (done) {
          slackMessage.text = 'pingregex 6 1';
          delete errorContext.error;
          errorContext = {
            param: true,
            mParams: true,
            sampleParams: [1, 3],
            noOfErrors: 2,
            failedParams: [{
              recommend: '1', error: '6 is incorrect',
            }, {
              recommend: '3', error: '1 is incorrect',
            }],
          };
          errorContext.parsedMessage = messageParser(slackMessage);

          const errorMessage = responseHandler.generateErrorTemplate('testbot1',
            testBots.bots[0].config.botCommand, errorContext);

          const onMessageSpy = sandbox.spy((response) => {
            setTimeout(() => {
              expect(response.message).to.equal(errorMessage);
              done();
            }, 1);
          });

          testBots.start().then((botEvt) => {
            botEvt[0].on('message', onMessageSpy);

            botEvt[0].on('connect', () => {
              botEvt[0].injectMessage(slackMessage);
            });
          });
        });

      it('Success command vaidation for two arguments',
        function (done) {
          slackMessage.text = 'pingarg 2 4';

          const onMessageSpy = sandbox.spy((response) => {
            setTimeout(() => {
              expect(response.message).to.equal('Hello 2,4');
              done();
            }, 1);
          });

          testBots.start().then((botEvt) => {
            botEvt[0].on('message', onMessageSpy);

            botEvt[0].on('connect', () => {
              botEvt[0].injectMessage(slackMessage);
            });
          });
        });

      it('Should show param specific error message for validation error',
        function (done) {
          slackMessage.text = 'pingarg hello 4';
          delete errorContext.error;
          errorContext.failedParams = [{
            error: 'HELLO is incorrect',
            recommend: '1',
          }];
          errorContext.sampleParams = [1, 3];
          errorContext.noOfErrors = 1;
          errorContext.parsedMessage = messageParser(slackMessage);
          const errorMessage = responseHandler.generateErrorTemplate('testbot1',
            testBots.bots[0].config.botCommand, errorContext);

          const onMessageSpy = sandbox.spy((response) => {
            setTimeout(() => {
              expect(response.message).to.equal(errorMessage);
              done();
            }, 1);
          });

          testBots.start().then((botEvt) => {
            botEvt[0].on('message', onMessageSpy);

            botEvt[0].on('connect', () => {
              botEvt[0].injectMessage(slackMessage);
            });
          });
        });

      it('Should show param specific error message for two validation error',
        function (done) {
          slackMessage.text = 'pingarg hello 5';
          delete errorContext.error;
          errorContext.failedParams = [{
            error: 'HELLO is incorrect',
            recommend: '1',
          }, {
            error: '5 is incorrect',
            recommend: '3',
          }];
          errorContext.sampleParams = [1, 3];
          errorContext.noOfErrors = 2;
          errorContext.parsedMessage = messageParser(slackMessage);
          const errorMessage = responseHandler.generateErrorTemplate('testbot1',
            testBots.bots[0].config.botCommand, errorContext);

          const onMessageSpy = sandbox.spy((response) => {
            setTimeout(() => {
              expect(response.message).to.equal(errorMessage);
              done();
            }, 1);
          });

          testBots.start().then((botEvt) => {
            botEvt[0].on('message', onMessageSpy);

            botEvt[0].on('connect', () => {
              botEvt[0].injectMessage(slackMessage);
            });
          });
        });
    });

    describe('isLimitValid', function () {
      beforeEach(function () {
        initTestSetup({
          config: config.singleBotForAllowedParam,
          slackMessage: {
            text: 'pingLimit',
          },
        });
      });

      it('Should pass command vaidation with default value', function (done) {
        const onMessageSpy = sandbox.spy((response) => {
          setTimeout(() => {
            expect(response.message).to.equal('Hello 1');
            done();
          }, 1);
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it('Should pass command vaidation with value 1', function (done) {
        slackMessage.text = 'pingLimit 1';

        const onMessageSpy = sandbox.spy((response) => {
          setTimeout(() => {
            expect(response.message).to.equal('Hello 1');
            done();
          }, 1);
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it('Should pass command vaidation with value 2', function (done) {
        slackMessage.text = 'pingLimit 2';

        const onMessageSpy = sandbox.spy((response) => {
          setTimeout(() => {
            expect(response.message).to.equal('Hello 2');
            done();
          }, 1);
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it('Should fail command vaidation with value 30', function (done) {
        slackMessage.text = 'pinglimit 30';
        delete errorContext.error;
        errorContext.limit = true;
        errorContext.parsedMessage = messageParser(slackMessage);

        const errorMessage = responseHandler.generateErrorTemplate('testbot1',
          testBots.bots[0].config.botCommand, errorContext);

        const onMessageSpy = sandbox.spy((response) => {
          setTimeout(() => {
            expect(response.message).to.equal(errorMessage);
            done();
          }, 1);
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });
    });

    describe('isLimitValid and isAllowedParamValid', function () {
      beforeEach(function () {
        initTestSetup({
          config: config.singleBotForAllowedParam,
          slackMessage: {
            text: 'hybrid',
          },
        });
      });

      it('Should pass command vaidation with default value', function (done) {
        const onMessageSpy = sandbox.spy((response) => {
          setTimeout(() => {
            expect(response.message).to.equal('Hello 1');
            done();
          }, 1);
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it('Should pass command vaidation with value 1', function (done) {
        slackMessage.text = 'hybrid 1';

        const onMessageSpy = sandbox.spy((response) => {
          setTimeout(() => {
            expect(response.message).to.equal('Hello 1');
            done();
          }, 1);
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it('Should pass command vaidation with value 2', function (done) {
        slackMessage.text = 'hybrid 2';

        const onMessageSpy = sandbox.spy((response) => {
          setTimeout(() => {
            expect(response.message).to.equal('Hello 2');
            done();
          }, 1);
        });

        testBots.start().then((botEvt) => {
          botEvt[0].on('message', onMessageSpy);

          botEvt[0].on('connect', () => {
            botEvt[0].injectMessage(slackMessage);
          });
        });
      });

      it('Should fail command vaidation with value 30', function (done) {
        slackMessage.text = 'hybrid 30';
        delete errorContext.error;
        errorContext.limit = true;
        errorContext.parsedMessage = messageParser(slackMessage);
        const errorMessage = responseHandler.generateErrorTemplate('testbot1',
          testBots.bots[0].config.botCommand, errorContext);

        const onMessageSpy = sandbox.spy((response) => {
          setTimeout(() => {
            expect(response.message).to.equal(errorMessage);
            done();
          }, 1);
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

    it('Should block user and respond error', function (done) {
      delete errorContext.error;
      errorContext.restrictedUser = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      errorContext.users = testBots.bots[0].config.allowedUsers;
      const errorMessage = responseHandler.generateErrorTemplate('testbot1',
        testBots.bots[0].config.botCommand, errorContext);

      const onMessageSpy = sandbox.spy((response) => {
        setTimeout(() => {
          expect(response.message).to.equal(errorMessage);
          done();
        }, 1);
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

      const onMessageSpy = sandbox.spy((response) => {
        setTimeout(() => {
          expect(response.message).to.equal('Hello 1');
          done();
        }, 1);
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
      const errorMessage = responseHandler.generateErrorTemplate('testbot1',
        testBots.bots[0].config.botCommand, errorContext);

      const onMessageSpy = sandbox.spy((response) => {
        setTimeout(() => {
          expect(response.message).to.equal(errorMessage);
          done();
        }, 1);
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

    it('Should respond with blocked message on DM', function (done) {
      delete errorContext.error;
      errorContext.botDirectMessageError = true;

      const errorMessage = responseHandler
        .generateBotResponseTemplate(errorContext);

      const onMessageSpy = sandbox.spy((response) => {
        setTimeout(() => {
          expect(response.message).to.equal(errorMessage);
          done();
        }, 1);
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
      const errorMessage = responseHandler
        .generateBotResponseTemplate(errorContext);

      const onMessageSpy = sinon.spy((response) => {
        setTimeout(() => {
          expect(response.message).to.equal(errorMessage);
          done();
        }, 1);
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });

    it('Should respond with blocked message on ' +
      'private group with custom message', function (done) {
      slackMessage.channel = 'G0GL06JD7';
      slackMessage.text = 'testbot1 ping 1';
      delete errorContext.error;
      errorContext.botDirectMessageError = true;
      const errorMessage = responseHandler
        .generateBotResponseTemplate(errorContext);

      const onMessageSpy = sandbox.spy((response) => {
        setTimeout(() => {
          expect(response.message).to.equal(errorMessage);
          done();
        }, 1);
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });

    it('Should not respond for non-bot message' +
      'in private group', function (done) {
      slackMessage.channel = 'G0GL06JD7';
      slackMessage.text = 'ping 1';
      const onMessageSpy = sinon.spy();

      setTimeout(() => {
        expect(onMessageSpy).to.not.called;
        done();
      }, 100);

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });

    it('Should respond to messages in public channel', function (done) {
      slackMessage.channel = 'C0GL06JD7';
      slackMessage.text = 'testbot1 ping 1';

      const onMessageSpy = sandbox.spy((response) => {
        setTimeout(() => {
          expect(response.message).to.equal('Hello 1');
          done();
        }, 1);
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
      socketServer.closeClient();
    });

    it('Should respond with blocked message on' +
      'private group with custom message', function (done) {
      slackMessage.channel = 'G0GL06JD7';
      slackMessage.text = 'testbot1 ping 1';
      delete errorContext.error;
      errorContext.botDirectMessageError = true;
      errorContext.message = 'Hi <@U0GG92T46> custom message';
      const errorMessage = responseHandler
        .generateBotResponseTemplate(errorContext);

      const onMessageSpy = sinon.spy((response) => {
        setTimeout(() => {
          expect(response.message).to.equal(errorMessage);
          done();
        }, 1);
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });
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
    });

    it('Should call getData for data command', function (done) {
      slackMessage.text = 'ping';

      const onMessageSpy = sandbox.spy((response) => {
        setTimeout(() => {
          expect(response.message).to.equal('Hello 1');
          done();
        }, 1);
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

      const onMessageSpy = sandbox.spy((response) => {
        setTimeout(() => {
          if (response.message === 'Hello 1') {
            done();
          }
        }, 1);
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
      errorContext.param = true;
      errorContext.parsedMessage = messageParser(slackMessage);

      const errorMessage = responseHandler.generateErrorTemplate('testbot1',
        testBots.bots[0].config.botCommand, errorContext);

      const onMessageSpy = sandbox.spy((response) => {
        setTimeout(() => {
          expect(response.message).to.equal(errorMessage);
          done();
        }, 1);
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
      errorContext.param = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      const errorMessage = responseHandler.generateErrorTemplate('testbot1',
        testBots.bots[0].config.botCommand, errorContext);

      const onMessageSpy = sandbox.spy((response) => {
        setTimeout(() => {
          expect(response.message).to.equal(errorMessage);
          done();
        }, 1);
      });

      testBots.start().then((botEvt) => {
        botEvt[0].on('message', onMessageSpy);

        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage(slackMessage);
        });
      });
    });

    it('Should call schedule command', function (done) {
      sandbox.stub(storage, 'getEvents').callsFake(() => {
        return Promise.resolve({
          events: {},
          schedule: config.schedule,
        });
      });
      const clock = sandbox.useFakeTimers(new Date());

      const onMessageSpy = sandbox.spy((response) => {
        if (onMessageSpy.getCalls().length === 1) {
          expect(response.message).to.eq('Hello 1');
          clock.tick(60000);
        }
        if (onMessageSpy.getCalls().length === 2) {
          expect(response.message).to.eq('Hello 1');
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
