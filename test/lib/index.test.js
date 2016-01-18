'use strict';

const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;
const sinonChai = require('sinon-chai');
const _ = require('lodash');
const SlackBot = require('./../../lib/index');
const connector = require('./../../lib/connector');
const socket = require('./../../lib/bot/socket');
const config = require('../mock/config');

chai.use(sinonChai);
describe('single bot', function () {

  beforeEach(function () {
    this.slackConnect = sinon.stub(connector, 'connect', function () {
      return new Promise(function (resolve) {
        resolve({slackData: {url: 'dummy'}});
      });
    });
    this.webSocket = sinon.stub(socket, 'createSocket', function () {
      return new Promise(function (resolve) {
        resolve({botInfo: {ws: 'dummy'}});
      });
    });
    this._startWebsocket = sinon.stub(SlackBot.prototype, '_startWebsocket');
    this.testBots = new SlackBot(config.singleBot);
    this.testBots.start();
  }); 

  afterEach(function () {
    this.slackConnect.restore();
    this.webSocket.restore();
    this._startWebsocket.restore();
  });

  describe('Should instantiate slackbots correctly', function () {

    it('Should contain all the basic config', function () {
      expect(this.testBots.slackBot.slackBotConfig).to.be.ok;
      expect(this.testBots.slackBot.slackBotConfig.bots).to.be.ok;
      expect(this.testBots.slackBot.slackBotConfig.bots).to.be.ok;
    });

    it('Should contain bot token and command for bots', function () {
      _.forEach(this.testBots.slackBot.slackBotConfig.bots, function (bot) {
        expect(bot.botToken).to.be.ok;
        expect(bot.botCommand).to.be.ok;
      });
    });

    it('Should call the _startWebsocket for each bot', function () {
      expect(this._startWebsocket).to.have.been.calledOnce;
    });

  });

});

describe('multiple bot', function () {

  beforeEach(function () {
    this.slackConnect = sinon.stub(connector, 'connect', function () {
      return new Promise(function (resolve) {
        resolve({slackData: {url: 'dummy'}});
      });
    });
    this.webSocket = sinon.stub(socket, 'createSocket', function () {
      return new Promise(function (resolve) {
        resolve({botInfo: {ws: 'dummy'}});
      });
    });
    this._startWebsocket = sinon.stub(SlackBot.prototype, '_startWebsocket');
    this.testBots = new SlackBot(config.multipleBot);
    this.testBots.start();
  }); 

  afterEach(function () {
    this.slackConnect.restore();
    this.webSocket.restore();
    this._startWebsocket.restore();
  });

  describe('Should instantiate slackbots correctly', function () {

    it('Should contain all the basic config', function () {
      expect(this.testBots.slackBot.slackBotConfig).to.be.ok;
      expect(this.testBots.slackBot.slackBotConfig.bots).to.be.ok;
      expect(this.testBots.slackBot.slackBotConfig.bots).to.be.ok;
    });

    it('Should contain bot token and command for bots', function () {
      _.forEach(this.testBots.slackBot.slackBotConfig.bots, function (bot) {
        expect(bot.botToken).to.be.ok;
        expect(bot.botCommand).to.be.ok;
      });
    });

    it('Should call the _startWebsocket for each bot', function () {
      expect(this._startWebsocket).to.have.been.calledTwice;
    });

  });

});