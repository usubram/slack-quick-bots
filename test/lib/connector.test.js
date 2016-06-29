'use strict';

const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;
const sinonChai = require('sinon-chai');
const _ = require('lodash');
const rewire = require('rewire');
const config = require('../mock/config');
const connectorRewire = rewire('./../../lib/connector');
const Bots = require('./../../lib/bot/bots');
const Bot = require('./../../lib/bot/bot');

chai.use(sinonChai);

describe('/connector', function () {
  describe('validate connection successfully', function () {
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
      connectorRewire.connect(slackBot).then(function (bot) {
        expect(bot.slackData.url).to.equal('url.com');
      }).catch(function(err) {
        setTimeout(function() {
          throw err; 
        });
      });
      expect(retryConnectionStub).to.not.have.been.called;
    });
  });
});