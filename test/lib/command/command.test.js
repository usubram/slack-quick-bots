'use strict';

const _ = require('lodash');
const botLogger = require('../../../lib/utils/logger');
const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;

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

  describe('validateCommand', function () {

    describe('isAllowedParamValid', function () {

      var testBots;
      var errorContext;
      var slackMessage;
      var updateEventsStub;
      var messageParser;
      var messageOptions;
      var apiRequestFetchStub;

      beforeEach(function () {
        testBots = new SlackBot(config.singleBotForAllowedParam, { isMock: true });
        updateEventsStub = sinon.stub(storage, 'updateEvents', () => {
          return Promise.resolve({});
        });
        apiRequestFetchStub = sinon.stub(apiRequest, 'fetch', () => {
          return Promise.resolve({
            members: [],
            channels: []
          });
        });
        errorContext = {
          error: true
        };
        slackMessage = {
          id: uuid.v4(),
          type: 'message',
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'ping',
          ts: '1453007224.000007',
          team: 'T0GGDKVDE'
        };
        messageOptions = {
          name: 'testbot1',
          id: 'U1234567',
          isDirectMessage: true
        };
        messageParser = message.parse(
          _.map(_.keys(_.get(config, 'singleBot.bots.0.botCommand')),
            _.toUpper), messageOptions);
      });

      afterEach(function () {
        updateEventsStub.restore();
        apiRequestFetchStub.restore();
        socketServer.closeClient();
      });

      it('Should pass command vaidation with default value', function (done) {
        var onMessageSpy = sinon.spy((response) => {
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
        var onMessageSpy = sinon.spy((response) => {
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
        var onMessageSpy = sinon.spy((response) => {
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
        var errorMessage = responseHandler
          .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);

        var onMessageSpy = sinon.spy((response) => {
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

      var testBots;
      var errorContext;
      var slackMessage;
      var updateEventsStub;
      var messageParser;
      var messageOptions;
      var apiRequestFetchStub;

      beforeEach(function () {
        testBots = new SlackBot(config.singleBotForAllowedParam, { isMock: true });
        updateEventsStub = sinon.stub(storage, 'updateEvents', () => {
          return Promise.resolve({});
        });
        apiRequestFetchStub = sinon.stub(apiRequest, 'fetch', () => {
          return Promise.resolve({
            members: [],
            channels: []
          });
        });
        errorContext = {
          error: true
        };
        slackMessage = {
          id: uuid.v4(),
          type: 'message',
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'pingLimit',
          ts: '1453007224.000007',
          team: 'T0GGDKVDE'
        };
        messageOptions = {
          name: 'testbot1',
          id: 'U1234567',
          isDirectMessage: true
        };
        messageParser = message.parse(
          _.map(_.keys(_.get(config, 'singleBotForAllowedParam.bots.0.botCommand')),
            _.toUpper), messageOptions);
      });

      afterEach(function () {
        updateEventsStub.restore();
        apiRequestFetchStub.restore();
        socketServer.closeClient();
      });

      it('Should pass command vaidation with default value', function (done) {
        var onMessageSpy = sinon.spy((response) => {
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

        var onMessageSpy = sinon.spy((response) => {
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

        var onMessageSpy = sinon.spy((response) => {
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

        var errorMessage = responseHandler
          .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);

        var onMessageSpy = sinon.spy((response) => {
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

      var testBots;
      var errorContext;
      var slackMessage;
      var updateEventsStub;
      var messageParser;
      var messageOptions;
      var apiRequestFetchStub;

      beforeEach(function () {
        testBots = new SlackBot(config.singleBotForAllowedParam, { isMock: true });
        updateEventsStub = sinon.stub(storage, 'updateEvents', () => {
          return Promise.resolve({});
        });
        apiRequestFetchStub = sinon.stub(apiRequest, 'fetch', () => {
          return Promise.resolve({
            members: [],
            channels: []
          });
        });
        errorContext = {
          error: true
        };
        slackMessage = {
          id: uuid.v4(),
          type: 'message',
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'hybrid',
          ts: '1453007224.000007',
          team: 'T0GGDKVDE'
        };
        messageOptions = {
          name: 'testbot1',
          id: 'U1234567',
          isDirectMessage: true
        };
        messageParser = message.parse(
          _.map(_.keys(_.get(config, 'singleBotForAllowedParam.bots.0.botCommand')),
            _.toUpper), messageOptions);
      });

      afterEach(function () {
        updateEventsStub.restore();
        apiRequestFetchStub.restore();
        socketServer.closeClient();
      });

      it('Should pass command vaidation with default value', function (done) {
        var onMessageSpy = sinon.spy((response) => {
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

        var onMessageSpy = sinon.spy((response) => {
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

        var onMessageSpy = sinon.spy((response) => {
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
        var errorMessage = responseHandler
          .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);

        var onMessageSpy = sinon.spy((response) => {
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

    var testBots;
    var errorContext;
    var slackMessage;
    var updateEventsStub;
    var messageParser;
    var messageOptions;
    var apiRequestFetchStub;

    beforeEach(function () {
      testBots = new SlackBot(config.isCommandAllowed, { isMock: true });
      updateEventsStub = sinon.stub(storage, 'updateEvents', () => {
        return Promise.resolve({});
      });
      apiRequestFetchStub = sinon.stub(apiRequest, 'fetch', () => {
        return Promise.resolve({
          members: [],
          channels: []
        });
      });
      errorContext = {
        error: true
      };
      slackMessage = {
        id: uuid.v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T46',
        text: 'ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE'
      };
      messageOptions = {
        name: 'testbot1',
        id: 'U1234567',
        isDirectMessage: true
      };
      messageParser = message.parse(
        _.map(_.keys(_.get(config, 'isCommandAllowed.bots.0.botCommand')),
          _.toUpper), messageOptions);
    });

    afterEach(function () {
      updateEventsStub.restore();
      apiRequestFetchStub.restore();
      socketServer.closeClient();
    });

    it('Should block user and respond error', function (done) {
      delete errorContext.error;
      errorContext.restricted_user = true;
      errorContext.parsedMessage = messageParser(slackMessage);
      errorContext.users = testBots.bots[0].config.allowedUsers;
      var errorMessage = responseHandler
        .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);

      var onMessageSpy = sinon.spy((response) => {
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

      var onMessageSpy = sinon.spy((response) => {
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

    it('Should not error out if the user is not found', function (done) {
      slackMessage.user = 'U0GG92T47';

      var onMessageSpy = sinon.spy((response) => {
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

    var testBots;
    var errorContext;
    var slackMessage;
    var updateEventsStub;
    var apiRequestFetchStub;

    beforeEach(function () {
      testBots = new SlackBot(config.blockDirectMessage, { isMock: true });
      updateEventsStub = sinon.stub(storage, 'updateEvents', () => {
        return Promise.resolve({});
      });
      apiRequestFetchStub = sinon.stub(apiRequest, 'fetch', () => {
        return Promise.resolve({
          members: [],
          channels: []
        });
      });
      errorContext = {
        error: true
      };
      slackMessage = {
        id: uuid.v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T46',
        text: 'ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE'
      };
    });

    afterEach(function () {
      updateEventsStub.restore();
      apiRequestFetchStub.restore();
      socketServer.closeClient();
    });

    it('Should respond with blocked message on direct message', function (done) {
      delete errorContext.error;
      errorContext.bot_direct_message_error = true;

      var errorMessage = responseHandler
        .generateBotResponseTemplate(errorContext);

      var onMessageSpy = sinon.spy((response) => {
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
      delete errorContext.error;
      errorContext.bot_direct_message_error = true;
      var errorMessage = responseHandler
        .generateBotResponseTemplate(errorContext);

      var onMessageSpy = sinon.spy((response) => {
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

    it('Should respond to messages in public channel', function (done) {
      slackMessage.channel = 'C0GL06JD7';
      slackMessage.text = 'testbot1 ping 1';

      var onMessageSpy = sinon.spy((response) => {
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

  describe('Test command types', function () {

    var testBots;
    var errorContext;
    var slackMessage;
    var updateEventsStub;
    var messageParser;
    var messageOptions;
    var apiRequestFetchStub;

    beforeEach(function () {
      testBots = new SlackBot(config.commandTypeBots, { isMock: true });
      updateEventsStub = sinon.stub(storage, 'updateEvents', () => {
        return Promise.resolve({});
      });
      apiRequestFetchStub = sinon.stub(apiRequest, 'fetch', () => {
        return Promise.resolve({
          members: [],
          channels: []
        });
      });
      errorContext = {
        error: true
      };
      slackMessage = {
        id: uuid.v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T45',
        text: 'ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE'
      };
      messageOptions = {
        name: 'testbot1',
        id: 'U1234567',
        isDirectMessage: true
      };
      messageParser = message.parse(
        _.map(_.keys(_.get(config, 'commandTypeBots.bots.0.botCommand')),
          _.toUpper), messageOptions);
    });

    afterEach(function () {
      updateEventsStub.restore();
      apiRequestFetchStub.restore();
      socketServer.closeClient();
    });

    it('Should call getData for data command', function (done) {
      slackMessage.text = 'ping';

      var onMessageSpy = sinon.spy((response) => {
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

      var botMessage = responseHandler
        .generateBotResponseTemplate({ recursive_success: true });

      var onMessageSpy = sinon.spy((response) => {
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
      var errorMessage = responseHandler
        .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);

      var onMessageSpy = sinon.spy((response) => {
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
      var errorMessage = responseHandler
        .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);

      var onMessageSpy = sinon.spy((response) => {
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
