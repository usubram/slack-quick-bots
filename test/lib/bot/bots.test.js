'use strict';

const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;
const sinonChai = require('sinon-chai');
const _ = require('lodash');
const Bots = require('./../../../lib/bot/bots');
const config = require('../../mock/config');

chai.use(sinonChai);

describe('Bots', function () {
  beforeEach(function () {
    this.slackBots = new Bots(config.BotsTest.bots).getBots();
  });

  afterEach(function () {
    this.slackBots = null;
  });

  describe('Should instantiate bots correctly', function () {

    it('Should contain bot token and command for bots', function () {
      expect(this.slackBots).to.be.ok;
      _.forEach(this.slackBots, function (botInfo) {
        expect(botInfo.bot.botCommand).to.be.ok;
      });
    });

    it('Should contain normalized bots', function () {
      expect(this.slackBots).to.be.ok;
      _.forEach(this.slackBots, function (botInfo) {
        expect(botInfo.bot.botCommand['pingMe']).to.be.ok;
        expect(botInfo.bot.botCommand['autoData']).to.be.ok;
        expect(botInfo.bot.botCommand['stop'].parentTask).to.equal('autoData');
      });
    });

  });

});