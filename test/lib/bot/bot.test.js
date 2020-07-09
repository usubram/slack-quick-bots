'use strict';

const _ = require('lodash');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;

const uuid = require('uuid');
const root = '../../../';

const botLogger = require(root + 'lib/utils/logger');
const SlackBot = require(root + 'lib/index');
const socketServer = require(root + '/lib/bot/socket-server');
const config = require(root + 'test/mock');
const responseHandler = require(root + 'lib/bot/response-handler');
const message = require(root + 'lib/command/message');
const storage = require(root + 'lib/storage/storage');
const apiRequest = require(root + 'lib/slack-api/api-request');

botLogger.setLogger();

describe('/bot', function () {
  describe('direct message', function () {
    let testBots;
    let errorContext;
    let slackMessage;
    let updateEventsStub;
    let messageParser;
    let messageOptions;
    let apiRequestFetchStub;

    beforeEach(function () {
      testBots = new SlackBot(config.singleBot, {
        isMock: true,
      });
      updateEventsStub = sinon.stub(storage, 'updateEvents').callsFake(() => {
        return Promise.resolve({});
      });
      apiRequestFetchStub = sinon.stub(apiRequest, 'fetch').callsFake(() => {
        return Promise.resolve({
          members: [],
          channels: [],
        });
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
        _.map(_.keys(_.get(config, 'singleBot.bots.0.botCommand')),
          _.toUpper), messageOptions);
    });

    afterEach(function () {
      updateEventsStub.restore();
      apiRequestFetchStub.restore();
      testBots.shutdown();
      socketServer.closeClient();
    });

    it('Should response with the expected response', function (done) {
      const onMessageSpy = sinon.spy((response) => {
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
      const errorMessage = responseHandler.generateErrorTemplate('testbot1',
        testBots.bots[0].config.botCommand, errorContext);

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

    it('Should respond with uppercase command', function (done) {
      slackMessage.text = 'PING';
      const onMessageSpy = sinon.spy((response) => {
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
      const errorMessage = responseHandler.generateErrorTemplate('testbot1',
        testBots.bots[0].config.botCommand, errorContext);

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

  describe('channel message', function () {
    let testBots;
    let errorContext;
    let slackMessage;
    let messageParser;
    let messageOptions;
    let apiRequestFetchStub;

    beforeEach(function () {
      testBots = new SlackBot(config.singleBot, {
        isMock: true,
      });
      apiRequestFetchStub = sinon.stub(apiRequest, 'fetch').callsFake(() => {
        return Promise.resolve({
          members: [],
          channels: [],
        });
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
        _.map(_.keys(_.get(config, 'singleBot.bots.0.botCommand')),
          _.toUpper), messageOptions);
    });

    afterEach(function () {
      apiRequestFetchStub.restore();
      testBots.shutdown();
      socketServer.closeClient();
    });

    it('Should call dispatchMessage with correct arguments', function (done) {
      const onMessageSpy = sinon.spy((response) => {
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

    it('Should call dispatchMessage with botname and command without param',
      function (done) {
        slackMessage.text = 'testbot1 ping';
        const onMessageSpy = sinon.spy((response) => {
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
      const onMessageSpy = sinon.spy();
      const onConnectSpy = sinon.spy();

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
      const onMessageSpy = sinon.spy();
      const onConnectSpy = sinon.spy();

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

    it('Should show help message for message starting with' +
      'botname and wrong command', function (done) {
      slackMessage.text = 'testbot1 wrong command';
      errorContext.parsedMessage = messageParser(slackMessage);

      const errorMessage = responseHandler.generateErrorTemplate('testbot1',
        testBots.bots[0].config.botCommand, errorContext);

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
});
