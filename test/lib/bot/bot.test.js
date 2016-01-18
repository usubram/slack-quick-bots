'use strict';

const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;
const sinonChai = require('sinon-chai');
const _ = require('lodash');
const Bots = require('./../../../lib/bot/bots');
const Bot = require('./../../../lib/bot/bot');
const config = require('../../mock/config');

chai.use(sinonChai);

describe('Bot', function () {
  describe('direct message', function () {

    var dispatchMessage,
      respondWithHelp,
      respondWithError,
      slackMessage,
      slackBot;

    beforeEach(function () {

      dispatchMessage = sinon.stub(Bot.prototype, '_dispatchMessage');
      respondWithHelp = sinon.stub(Bot.prototype, '_respondWithHelp');
      respondWithError = sinon.stub(Bot.prototype, '_respondWithError');

      slackBot = new Bot(Bots.prototype._normalizeCommand(config.singleBot.bots[0]));

      slackMessage = {
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T45',
        text: 'ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE'
      };
    });

    afterEach(function () {
      dispatchMessage.restore();
      respondWithHelp.restore();
      respondWithError.restore();
      slackBot = {};
      slackMessage = {};
    });

    it('Should call _dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith(undefined, 'D0GL06JD7', 'Hello 1');
      expect(dispatchMessage).to.have.been.calledWith(undefined, 'D0GL06JD7', '', 'typing');
      expect(dispatchMessage).to.have.been.calledTwice;
      expect(respondWithHelp).to.not.have.called;
      expect(respondWithError).to.not.have.called;
    });

    it('Should call _dispatchMessage with empty message', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = '';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith(undefined, 'D0GL06JD7', '', 'typing');
      expect(dispatchMessage).to.not.have.been.calledOnce;
      expect(respondWithError).to.have.called;
      expect(respondWithHelp).to.not.have.called;
    });

    it('Should call _dispatchMessage with wrong command', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'wrong command';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith(undefined, 'D0GL06JD7', '', 'typing');
      expect(dispatchMessage).to.not.have.been.calledOnce;
      expect(respondWithError).to.have.called;
      expect(respondWithHelp).to.not.have.called;
    });

  });

  describe('channel message', function () {
    var dispatchMessage,
      respondWithHelp,
      respondWithError,
      slackMessage,
      slackBot;

    beforeEach(function () {

      dispatchMessage = sinon.stub(Bot.prototype, '_dispatchMessage');
      respondWithHelp = sinon.stub(Bot.prototype, '_respondWithHelp');
      respondWithError = sinon.stub(Bot.prototype, '_respondWithError');

      slackBot = new Bot(Bots.prototype._normalizeCommand(config.singleBot.bots[0]));

      slackBot.bot.botName = 'botname';
      slackMessage = {
        type: 'message',
        channel: 'C0GL06JD7',
        user: 'U0GG92T45',
        text: 'botname ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE'
      };

    });

    afterEach(function () {
      dispatchMessage.restore();
      respondWithHelp.restore();
      respondWithError.restore();
      slackBot = null;
      slackMessage = {};
    });

    it('Should call _dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledTwice;
      expect(respondWithHelp).to.not.have.called;
      expect(respondWithError).to.not.have.called;
      expect(dispatchMessage).to.have.been.calledWith(undefined, 'C0GL06JD7', '', 'typing');
      expect(dispatchMessage).to.have.been.calledWith(undefined, 'C0GL06JD7', 'Hello 1');
    });

    it('Should call _dispatchMessage with botname and command without param', function () {
      expect(slackBot).to.be.ok;
      slackBot.bot.botName = 'botname';
      slackMessage.text = 'botname ping';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledTwice;
      expect(respondWithHelp).to.not.have.called;
      expect(respondWithError).to.not.have.called;

      expect(dispatchMessage).to.have.been.calledWith(undefined, 'C0GL06JD7', '', 'typing');
      expect(dispatchMessage).to.have.been.calledWith(undefined, 'C0GL06JD7', 'Hello 1');
    });

    it('Should not call _dispatchMessage', function () {
      expect(slackBot).to.be.ok;
      slackBot.bot.botName = 'name';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
      expect(respondWithHelp).to.not.have.called;
      expect(respondWithError).to.not.have.called;

    });

    it('Should not call _dispatchMessage without botname', function () {
      expect(slackBot).to.be.ok;
      slackBot.bot.botName = 'botname';
      slackMessage.text = 'ping 1';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
      expect(respondWithHelp).to.not.have.called;
      expect(respondWithError).to.not.have.called;

    });

    it('Should show help message for message starting with botname and wrong command', function () {
      expect(slackBot).to.be.ok;
      slackBot.bot.botName = 'botname';
      slackMessage.text = 'botname wrong command';

      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
      expect(respondWithHelp).to.have.calledOnce;
      expect(respondWithError).to.not.have.called;

    });
  });

});
