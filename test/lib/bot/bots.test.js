'use strict';

const _ = require('lodash');

const chai = require('chai');
const expect = chai.expect;
const sinonChai = require('sinon-chai');
const { Bots } = require('./../../../lib/bot/bots');
const config = require('../../mock/config');

chai.use(sinonChai);

describe('/bots', function () {
  describe('Should instantiate bots correctly', function () {
    let slackBots;

    beforeEach(function () {
      slackBots = new Bots(config.BotsTest.bots).getBots();
    });

    afterEach(function () {
      slackBots = null;
    });

    describe('Should instantiate bots correctly', function () {
      it('Should contain bot token and command for bots', function () {
        expect(slackBots).to.be.ok;
        _.forEach(slackBots, function (botInfo) {
          expect(botInfo.config.botCommand).to.be.ok;
        });
      });

      it('Should contain normalized bots', function () {
        expect(slackBots).to.be.ok;
        _.forEach(slackBots, function (botInfo) {
          expect(botInfo.config.botCommand['PING-ME']).to.be.ok;
          expect(botInfo.config.botCommand['STOP']).to.be.undefined;
        });
      });
    });
  });

  describe('Should instantiate bots correctly for recurive tasks', function () {
    let slackBots;

    beforeEach(function () {
      slackBots = new Bots(config.BotsTestWithRecursiveTasks.bots).getBots();
    });

    afterEach(function () {
      slackBots = null;
    });

    describe('Should instantiate bots correctly', function () {
      it('Should contain bot token and command for bots', function () {
        expect(slackBots).to.be.ok;
        _.forEach(slackBots, function (botInfo) {
          expect(botInfo.config.botCommand).to.be.ok;
        });
      });

      it('Should contain normalized bots', function () {
        expect(slackBots).to.be.ok;
        _.forEach(slackBots, function (botInfo) {
          expect(botInfo.config.botCommand['PING-ME']).to.be.ok;
          expect(botInfo.config.botCommand['AUTODATA']).to.be.ok;
          expect(botInfo.config.botCommand['STOP']).to.be.ok;
          expect(botInfo.config.botCommand['STOP'].allowedParam)
            .to.deep.equal(['AUTODATA']);
        });
      });
    });
  });
});
