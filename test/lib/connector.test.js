'use strict';

const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const _ = require('lodash');
const config = require('../mock/config');
const { Connector } = require('./../../lib/bot/connector');
const SlackBot = require('./../../lib/index');
const socketServer = require('./../../lib/bot/socket-server');
const apiRequest = require('./../../lib/slack-api/api-request');

describe('/connector', function () {
  let slackBot;
  let clock;
  let connectSpy;
  let botConfig;
  let apiRequestFetchStub;

  beforeEach(function () {
    botConfig = _.cloneDeep(config.singleBot);
    apiRequestFetchStub = sinon.stub(apiRequest, 'fetch').callsFake(() => {
      return Promise.resolve({
        members: [],
        channels: [],
      });
    });
  });

  afterEach(function () {
    slackBot = undefined;
    socketServer.closeClient();
    apiRequestFetchStub.restore();
    connectSpy.restore();
    if (clock) {
      clock.restore();
    }
  });

  it('Should connect to socker server at first attempt and respond',
    function (done) {
      slackBot = new SlackBot(botConfig, {
        isMock: true,
      });
      connectSpy = sinon.spy(Connector.prototype, 'connect');

      slackBot.start().then((botEvt) => {
        botEvt[0].on('message', (response) => {
          expect(connectSpy).to.be.calledOnce;
          expect(response.message).to.equal('Hello 1');
          done();
        });
        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage({
            text: 'ping 1',
            channel: 'D1234567',
          });
        });
      });
    });

  it('Should connect to socker server after 3rd attempt and respond',
    function (done) {
      _.set(botConfig, 'bots[0].mock.retryAttempt', 2);

      clock = sinon.useFakeTimers();
      slackBot = new SlackBot(botConfig, {
        isMock: true,
      });
      connectSpy = sinon.spy(Connector.prototype, 'connect');

      slackBot.start().then((botEvt) => {
        clock.tick(2001);
        botEvt[0].on('message', (response) => {
          expect(connectSpy).to.be.calledTwice;
          expect(response.message).to.equal('Hello 2');
          done();
        });
        botEvt[0].on('connect', () => {
          botEvt[0].injectMessage({
            text: 'ping 2',
            channel: 'D1234567',
          });
        });
      });
    });

  it('Should fail on auth error and should not retry', function (done) {
    _.set(botConfig, 'bots[0].mock.retryAttempt', 2);
    _.set(botConfig, 'bots[0].mock', {
      error: 'invalid_auth',
    });

    slackBot = new SlackBot(botConfig, {
      isMock: true,
    });
    connectSpy = sinon.spy(Connector.prototype, 'connect');

    slackBot.start().then(() => {
      expect(connectSpy).to.be.calledOnce;
      done();
    });
  });

  it('Should shutdown bot successfully', function (done) {
    slackBot = new SlackBot(botConfig, {
      isMock: true,
    });
    connectSpy = sinon.spy(Connector.prototype, 'connect');

    slackBot.start().then((botEvt) => {
      botEvt[0].on('connect', () => {
        botEvt[0].shutdown();
      });

      botEvt[0].on('shutdown', () => {
        done();
      });
    });
  });

  it('Should close bot successfully', function (done) {
    slackBot = new SlackBot(botConfig, {
      isMock: true,
    });
    connectSpy = sinon.spy(Connector.prototype, 'connect');
    clock = sinon.useFakeTimers();
    let count = 2;

    slackBot.start().then((botEvt) => {
      botEvt[0].on('connect', () => {
        --count;
        botEvt[0].close();

        if (count === 0) {
          botEvt[0].shutdown();
        }
      });

      botEvt[0].on('close', () => {
        clock.tick(3000);
      });

      botEvt[0].on('shutdown', () => {
        done();
      });
    });
  });
});
