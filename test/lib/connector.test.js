'use strict';

const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;
const sinonChai = require('sinon-chai');
const _ = require('lodash');
const rewire = require('rewire');
const config = require('../mock/config');
const ConnectorRewire = rewire('./../../lib/bot/connector');
const Bots = require('./../../lib/bot/bots');
const Bot = require('./../../lib/bot/bot');
const socketServer = require('./../../lib/bot/socket-server');

chai.use(sinonChai);

describe('/connector', function () {
  describe('validate successfully connection', function () {
    var slackBot,
      setupBotEventsStub,
      retryConnectionStub,
      connectionResponse;

    beforeEach(function () {
      setupBotEventsStub = sinon.stub(Bot.prototype, 'setupBotEvents');
      slackBot = new Bots(config.singleBot.bots).getBots()[0];
      retryConnectionStub = sinon.stub(connectorRewire.__get__('internals'), "retryConnection");
      connectorRewire.__set__('internals.makeRequest', function () {
        return new Promise((resolve, reject) => {
          resolve({url: 'url.com'});
        });
      });
    });

    afterEach(function () {
      setupBotEventsStub.restore();
      retryConnectionStub.restore();
      slackBot = undefined;
      connectionResponse = undefined;
    });

    it('Should pass connection and return connection url', function () {
      ConnectorRewire.connect(slackBot).then(function (bot) {
        expect(bot.slackData.url).to.equal('url.com');
      }).catch(function(err) {
        setTimeout(function() {
          throw err; 
        });
      });
      expect(retryConnectionStub).to.not.have.been.called;
    });
  });

  describe.only('reconnect on disconnection', function () {
    var slackBot,
      setupBotEventsStub,
      connectionResponse,
      connector,
      clock;

    beforeEach(function (done) {
      setupBotEventsStub = sinon.stub(Bot.prototype, 'setupBotEvents');
      slackBot = new Bots(config.singleBot.bots).getBots()[0];
      socketServer.connect(slackBot).then(() => {
        console.log('connected.. 1234');
        done();
      });
      ConnectorRewire.__set__('internals.makeRequest', function () {
        return new Promise((resolve, reject) => {
          resolve({ url: 'ws://0.0.0.0:4080' });
        });
      });
      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      setupBotEventsStub.restore();
      clock.restore();
      slackBot = undefined;
      connectionResponse = undefined;
    });

    it('Should pass connection and return connection url', function (done) {
      slackBot.connectionManager = new ConnectorRewire();
      //clock.tick(500);
      slackBot.connectionManager.connect(slackBot).then(function (bot) {
        expect(bot.slackData.url).to.equal('ws://0.0.0.0:4080');
        console.log('bot', bot);
        //done();
      }).catch(function(err) {
        // setTimeout(function() {
        //   throw err;
        // });
      });
      //expect(retryConnectionStub).to.not.have.been.called;
    }).timeout(500000);
  });
});
