'use strict';

const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;
const sinonChai = require('sinon-chai');
const _ = require('lodash');
const Bots = require('./../../../lib/bot/bots');
const config = require('../../mock/config');

chai.use(sinonChai);

describe('/bots', function () {
  describe('Should instantiate bots correctly', function () {
    var slackBots;
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
          expect(botInfo.command).to.be.ok;
        });
      });

      it('Should contain normalized bots', function () {
        expect(slackBots).to.be.ok;
        _.forEach(slackBots, function (botInfo) {
          expect(botInfo.command.commands['pingMe']).to.be.ok;
          expect(botInfo.command.commands['stop']).to.be.undefined;
        });
      });

    });
  });

  describe('Should instantiate bots correctly with recurive tasks', function () {
    var slackBots;
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
          expect(botInfo.command).to.be.ok;
        });
      });

      it('Should contain normalized bots', function () {
        expect(slackBots).to.be.ok;
        _.forEach(slackBots, function (botInfo) {
          expect(botInfo.command.commands['pingMe']).to.be.ok;
          expect(botInfo.command.commands['autoData']).to.be.ok;
          expect(botInfo.command.commands['stop']).to.be.ok;
          expect(botInfo.command.commands['stop'].allowedParam).to.deep.equal(['autoData']);
        });
      });

    });
  });

});