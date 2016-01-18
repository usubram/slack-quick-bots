'use strict';

const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;
const sinonChai = require('sinon-chai');
const _ = require('lodash');
const Bots = require('./../../../lib/bot/bots');
const Bot = require('./../../../lib/bot/bot');
const Command = require('./../../../lib/command/command');
const config = require('../../mock/config');

chai.use(sinonChai);

describe('Command', function () {
  describe('Test allowed param', function () {

    var respondToCommand,
      isAllowedParamValid,
      isLimitValid,
      dispatchMessage,
      slackMessage,
      slackBot;

    beforeEach(function () {

      isAllowedParamValid = sinon.spy(Command.prototype, '_isAllowedParamValid');
      isLimitValid = sinon.spy(Command.prototype, '_isLimitValid');
      respondToCommand = sinon.spy(Command.prototype, 'respondToCommand');
      dispatchMessage = sinon.stub(Bot.prototype, '_dispatchMessage');

      slackBot = new Bot(Bots.prototype._normalizeCommand(config.singleBotForAllowedParam.bots[0]));

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
      isAllowedParamValid.restore();
      isLimitValid.restore();
      respondToCommand.restore();
      dispatchMessage.restore();
      slackBot = {};
      slackMessage = {};
    });

    it('Should pass command vaidation with default value', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'ping';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(isAllowedParamValid).to.have.been.calledOnce;
      expect(isAllowedParamValid.returnValues).to.have.length(1);
      expect(isAllowedParamValid.returnValues[0]).to.equal(true);
      expect(isLimitValid).to.have.been.calledOnce;
      expect(isLimitValid.returnValues).to.have.length(1);
      expect(isLimitValid.returnValues[0]).to.equal(true);
      expect(respondToCommand).to.have.been.calledOnce;
    });

    it('Should pass command vaidation with value 1', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'ping 1';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(isAllowedParamValid).to.have.been.calledOnce;
      expect(isAllowedParamValid.returnValues).to.have.length(1);
      expect(isAllowedParamValid.returnValues[0]).to.equal(true);
      expect(isLimitValid).to.have.been.calledOnce;
      expect(isLimitValid.returnValues).to.have.length(1);
      expect(isLimitValid.returnValues[0]).to.equal(true);
      expect(respondToCommand).to.have.been.calledOnce;
    });

    it('Should pass command vaidation with value 2', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'ping 2';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(isAllowedParamValid).to.have.been.calledOnce;
      expect(isAllowedParamValid.returnValues).to.have.length(1);
      expect(isAllowedParamValid.returnValues[0]).to.equal(true);
      expect(isLimitValid).to.have.been.calledOnce;
      expect(isLimitValid.returnValues).to.have.length(1);
      expect(isLimitValid.returnValues[0]).to.equal(true);
      expect(respondToCommand).to.have.been.calledOnce;
    });

    it('Should fail command vaidation with value 3', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'ping 3';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(isAllowedParamValid).to.have.been.calledOnce;
      expect(isAllowedParamValid.returnValues).to.have.length(1);
      expect(isAllowedParamValid.returnValues[0]).to.equal(false);
      expect(isLimitValid).to.have.been.calledOnce;
      expect(isLimitValid.returnValues).to.have.length(1);
      expect(isLimitValid.returnValues[0]).to.equal(true);
      expect(respondToCommand).to.not.have.been.calledOnce;
    });

  });

  describe('Test limit param', function () {

    var respondToCommand,
      isAllowedParamValid,
      isLimitValid,
      dispatchMessage,
      slackMessage,
      slackBot;

    beforeEach(function () {

      isAllowedParamValid = sinon.spy(Command.prototype, '_isAllowedParamValid');
      isLimitValid = sinon.spy(Command.prototype, '_isLimitValid');
      respondToCommand = sinon.spy(Command.prototype, 'respondToCommand');
      dispatchMessage = sinon.stub(Bot.prototype, '_dispatchMessage');

      slackBot = new Bot(Bots.prototype._normalizeCommand(config.singleBotForAllowedParam.bots[0]));

      slackMessage = {
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T45',
        text: 'pingLimit 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE'
      };
    });

    afterEach(function () {
      isAllowedParamValid.restore();
      isLimitValid.restore();
      respondToCommand.restore();
      dispatchMessage.restore();
      slackBot = {};
      slackMessage = {};
    });

    it('Should pass command limit vaidation with default value', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'pingLimit';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(isAllowedParamValid).to.have.been.calledOnce;
      expect(isAllowedParamValid.returnValues).to.have.length(1);
      expect(isAllowedParamValid.returnValues[0]).to.equal(true);
      expect(isLimitValid).to.have.been.calledOnce;
      expect(isLimitValid.returnValues).to.have.length(1);
      expect(isLimitValid.returnValues[0]).to.equal(true);
      expect(respondToCommand).to.have.been.calledOnce;
    });

    it('Should pass command limit vaidation with default value 1', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'pingLimit 1';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(isAllowedParamValid).to.have.been.calledOnce;
      expect(isAllowedParamValid.returnValues).to.have.length(1);
      expect(isAllowedParamValid.returnValues[0]).to.equal(true);
      expect(isLimitValid).to.have.been.calledOnce;
      expect(isLimitValid.returnValues).to.have.length(1);
      expect(isLimitValid.returnValues[0]).to.equal(true);
      expect(respondToCommand).to.have.been.calledOnce;
    });

    it('Should pass command limit vaidation with default value 2', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'pingLimit 2';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(isAllowedParamValid).to.have.been.calledOnce;
      expect(isAllowedParamValid.returnValues).to.have.length(1);
      expect(isAllowedParamValid.returnValues[0]).to.equal(true);
      expect(isLimitValid).to.have.been.calledOnce;
      expect(isLimitValid.returnValues).to.have.length(1);
      expect(isLimitValid.returnValues[0]).to.equal(true);
      expect(respondToCommand).to.have.been.calledOnce;
    });

    it('Should fail command limit vaidation with default value 11', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'pingLimit 11';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(isAllowedParamValid).to.not.have.been.called;
      expect(isLimitValid).to.have.been.calledOnce;
      expect(isLimitValid.returnValues).to.have.length(1);
      expect(isLimitValid.returnValues[0]).to.equal(false);
      expect(respondToCommand).to.not.have.been.calledOnce;
    });

    it('Should fail command limit vaidation with default value 0', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'pingLimit 0';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(isAllowedParamValid).to.not.have.been.called;
      expect(isLimitValid).to.have.been.calledOnce;
      expect(isLimitValid.returnValues).to.have.length(1);
      expect(isLimitValid.returnValues[0]).to.equal(false);
      expect(respondToCommand).to.not.have.been.calledOnce;
    });

  });

  describe('Test command types', function () {

    var respondToCommand,
      getData,
      setUpRecursiveTask,
      killTask,
      dispatchMessage,
      slackMessage,
      slackBot;

    beforeEach(function () {

      respondToCommand = sinon.spy(Command.prototype, 'respondToCommand');
      getData = sinon.stub(Command.prototype, 'getData');
      setUpRecursiveTask = sinon.stub(Command.prototype, 'setUpRecursiveTask');
      killTask = sinon.stub(Command.prototype, 'killTask');

      dispatchMessage = sinon.stub(Bot.prototype, '_dispatchMessage');

      slackBot = new Bot(Bots.prototype._normalizeCommand(config.commandTypeBots.bots[0]));

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
      respondToCommand.restore();
      getData.restore();
      setUpRecursiveTask.restore();
      killTask.restore();
      dispatchMessage.restore();
      slackBot = {};
      slackMessage = {};
    });

    it('Should call getData for data command', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'ping';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(respondToCommand).to.have.been.calledOnce;
      expect(getData).to.have.been.calledOnce;
    });

    it('Should call setUpRecursiveTask for recursive command', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'auto';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(respondToCommand).to.have.been.calledOnce;
      expect(setUpRecursiveTask).to.have.been.calledOnce;
    });

    it('Should call killTask for kill command', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'stop';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(respondToCommand).to.have.been.calledOnce;
      expect(killTask).to.have.been.calledOnce;
    });

    it.skip('Should call callback with correct argument on calling getdata', function () {

    });

    it.skip('Should create timer with correct argument on calling setUpRecursiveTask', function () {

    });

    it.skip('Should clear timer with correct argument on calling killTask', function () {

    });

  });
});