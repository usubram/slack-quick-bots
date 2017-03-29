'use strict';

const _ = require('lodash');
const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;

const uuid = require('uuid');
const root = '../../../';

const botLogger = require(root + 'lib/utils/logger');
const SlackBot = require(root + 'lib/index');
const socketServer = require(root + '/lib/bot/socket-server');
const config = require(root + 'test/mock/config');
const responseHandler = require(root + 'lib/bot/response-handler');
const message = require(root + 'lib/command/message');
const storage = require(root + 'lib/storage/storage');

botLogger.setLogger();

describe('/bot', function () {
  describe('direct message', function () {

    var testBots;
    var errorContext;
    var slackMessage;
    var updateEventsStub;
    var messageParser;
    var messageOptions;

    beforeEach(function () {
      testBots = new SlackBot(config.singleBot, { isMock: true });
      updateEventsStub = sinon.stub(storage, 'updateEvents', () => {
        return Promise.resolve({});
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
      socketServer.closeClient();
    });

    it('Should response with the expected response', function (done) {
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

    it('Should respond with empty message', function (done) {
      slackMessage.text = '';
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

    it('Should respond with uppercase command', function (done) {
      slackMessage.text = 'PING';
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

    it('Should respond with error message', function (done) {
      slackMessage.text = 'wrong command';
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

  describe('channel message', function () {

    var testBots;
    var errorContext;
    var slackMessage;
    var messageParser;
    var messageOptions;

    beforeEach(function () {
      testBots = new SlackBot(config.singleBot, { isMock: true });
      errorContext = {
        error: true
      };
      slackMessage = {
        id: uuid.v4(),
        type: 'message',
        channel: 'C0GL06JD8',
        user: 'U0GG92T45',
        text: 'testbot1 ping 1',
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
      socketServer.closeClient();
    });

    it('Should call dispatchMessage with correct arguments', function (done) {
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

    it('Should call dispatchMessage with botname and command without param', function (done) {
      slackMessage.text = 'testbot1 ping';
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

    it('Should not call dispatchMessage', function (done) {
      slackMessage.text = 'hello';
      var onMessageSpy = sinon.spy();
      var onConnectSpy = sinon.spy();

      testBots.start().then((botEvt) => {
        botEvt[0].on('connect', onConnectSpy);
        botEvt[0].on('message', onMessageSpy);
      });

      setTimeout(() => {
        expect(onConnectSpy).to.be.calledOnce;
        expect(onMessageSpy).to.not.have.been.called;
        done();
      }, 50);
    });

    it('Should not call dispatchMessage without botname', function (done) {
      slackMessage.text = 'ping 1';
      var onMessageSpy = sinon.spy();
      var onConnectSpy = sinon.spy();

      testBots.start().then((botEvt) => {
        botEvt[0].on('connect', onConnectSpy);
        botEvt[0].on('message', onMessageSpy);
      });

      setTimeout(() => {
        expect(onConnectSpy).to.be.calledOnce;
        expect(onMessageSpy).to.not.have.been.called;
        done();
      }, 50);
    });

    it('Should show help message for message starting with botname and wrong command', function (done) {
      slackMessage.text = 'testbot1 wrong command';
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
