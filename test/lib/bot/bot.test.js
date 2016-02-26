'use strict';

const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;
const sinonChai = require('sinon-chai');
const _ = require('lodash');
const Bots = require('./../../../lib/bot/bots');
const Bot = require('./../../../lib/bot/bot');
const ResponseHandler = require('./../../../lib/bot/responseHandler');
const config = require('../../mock/config');

chai.use(sinonChai);

describe('/bot', function () {
  describe('direct message', function () {

    var dispatchMessage,
      dispatchMessageEventSpy,
      setupBotEventsStub,
      slackMessage,
      slackBot;
    beforeEach(function () {

      dispatchMessage = sinon.stub(Bot.prototype, '_dispatchMessage');
      dispatchMessageEventSpy = sinon.spy();
      setupBotEventsStub = sinon.stub(Bot.prototype, '_setupBotEvents');
      slackBot = new Bot(Bots.prototype._normalizeCommand(config.singleBot.bots[0]));
      slackBot.botName = 'botname';
      slackBot.responseHandler = new ResponseHandler(config.singleBot.bots[0].botCommand, 'botname');
      slackBot.command.eventEmitter.on('command:data:respond', dispatchMessageEventSpy);
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
      setupBotEventsStub.restore();
      slackBot = {};
      slackMessage = {};
    });

    it('Should call _dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith('D0GL06JD7', '', 'typing');
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ message: { channels: ["D0GL06JD7"], data: "Hello 1" } });
      expect(dispatchMessage).to.have.been.calledTwice;
    });

    it('Should call _dispatchMessage with empty message', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = '';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith('D0GL06JD7', '', 'typing');
      expect(dispatchMessage).to.not.have.been.calledTwice;
    });

    it('Should call _dispatchMessage with wrong command', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'wrong command';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith('D0GL06JD7', '', 'typing');
      expect(dispatchMessage).to.not.have.been.calledTwice;
    });

  });

  describe('channel message', function () {
    var dispatchMessage,
      dispatchMessageEventSpy,
      slackMessage,
      slackBot;

    beforeEach(function () {

      dispatchMessage = sinon.stub(Bot.prototype, '_dispatchMessage');
      dispatchMessageEventSpy = sinon.spy();
      slackBot = new Bot(Bots.prototype._normalizeCommand(config.singleBot.bots[0]));
      slackBot.responseHandler = new ResponseHandler(config.singleBot.bots[0].botCommand, 'botname');
      slackBot.command.eventEmitter.on('command:data:respond', dispatchMessageEventSpy);
      slackBot.botName = 'botname';
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
      slackBot = null;
      slackMessage = {};
    });

    it('Should call _dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith('C0GL06JD7', '', 'typing');
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ message: { channels: ["C0GL06JD7"], data: "Hello 1" } });
      expect(dispatchMessage).to.have.been.calledTwice;
    });

    it('Should call _dispatchMessage with botname and command without param', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'botname ping';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledTwice;
      expect(dispatchMessage).to.have.been.calledWith('C0GL06JD7', '', 'typing');
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ message: { channels: ["C0GL06JD7"], data: "Hello 1" } });
    });

    it('Should not call _dispatchMessage', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'name';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
    });

    it('Should not call _dispatchMessage without botname', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'ping 1';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
    });

    it('Should show help message for message starting with botname and wrong command', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'botname wrong command';

      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.called;
    });
  });

  describe('validate command type - data for DM', function () {
    var dispatchMessage,
      dispatchMessageEventSpy,
      setupBotEventsStub,
      slackMessage,
      slackBot;
    beforeEach(function () {

      dispatchMessage = sinon.stub(Bot.prototype, '_dispatchMessage');
      dispatchMessageEventSpy = sinon.spy();
      setupBotEventsStub = sinon.stub(Bot.prototype, '_setupBotEvents');
      slackBot = new Bot(Bots.prototype._normalizeCommand(config.singleBot.bots[0]));
      slackBot.botName = 'botname';
      slackBot.responseHandler = new ResponseHandler(config.singleBot.bots[0].botCommand, 'botname');
      slackBot.command.eventEmitter.on('command:data:respond', dispatchMessageEventSpy);
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
      setupBotEventsStub.restore();
      slackBot = {};
      slackMessage = {};
    });

    it('Should call _dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith('D0GL06JD7', '', 'typing');
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ message: { channels: ["D0GL06JD7"], data: "Hello 1" } });
      expect(dispatchMessage).to.have.been.calledTwice;
    });

    it('Should call _dispatchMessage with empty message', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = '';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith('D0GL06JD7', '', 'typing');
      expect(dispatchMessage).to.not.have.been.calledTwice;
    });

    it('Should call _dispatchMessage with wrong command', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'wrong command';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith('D0GL06JD7', '', 'typing');
      expect(dispatchMessage).to.not.have.been.calledTwice;
    });
  });

  describe('validate command type - data in channel', function () {
    var dispatchMessage,
      dispatchMessageEventSpy,
      slackMessage,
      slackBot;

    beforeEach(function () {

      dispatchMessage = sinon.stub(Bot.prototype, '_dispatchMessage');
      dispatchMessageEventSpy = sinon.spy();
      slackBot = new Bot(Bots.prototype._normalizeCommand(config.singleBot.bots[0]));
      slackBot.responseHandler = new ResponseHandler(config.singleBot.bots[0].botCommand, 'botname');
      slackBot.command.eventEmitter.on('command:data:respond', dispatchMessageEventSpy);
      slackBot.botName = 'botname';
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
      slackBot = null;
      slackMessage = {};
    });

    it('Should call _dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith('C0GL06JD7', '', 'typing');
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ message: { channels: ["C0GL06JD7"], data: "Hello 1" } });
      expect(dispatchMessage).to.have.been.calledTwice;
    });

    it('Should call _dispatchMessage with botname and command without param', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'botname ping';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledTwice;
      expect(dispatchMessage).to.have.been.calledWith('C0GL06JD7', '', 'typing');
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ message: { channels: ["C0GL06JD7"], data: "Hello 1" } });
    });

    it('Should not call _dispatchMessage', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'name';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
    });

    it('Should not call _dispatchMessage without botname', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'ping 1';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
    });
  });

  describe('validate command type - recursive for DM', function () {
    var dispatchMessage,
      dispatchMessageEventSpy,
      setupBotEventsStub,
      slackMessage,
      slackBot;
    beforeEach(function () {

      dispatchMessage = sinon.stub(Bot.prototype, '_dispatchMessage');
      dispatchMessageEventSpy = sinon.spy();
      setupBotEventsStub = sinon.stub(Bot.prototype, '_setupBotEvents');
      slackBot = new Bot(Bots.prototype._normalizeCommand(config.singleBot.bots[0]));
      slackBot.botName = 'botname';
      slackBot.responseHandler = new ResponseHandler(config.singleBot.bots[0].botCommand, 'botname');
      slackBot.command.eventEmitter.on('command:setup:recursive', dispatchMessageEventSpy);
      slackMessage = {
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T45',
        text: 'auto 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE'
      };
    });

    afterEach(function () {
      dispatchMessage.restore();
      setupBotEventsStub.restore();
      slackBot = {};
      slackMessage = {};
    });

    it('Should call _dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith('D0GL06JD7', '', 'typing');
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ message:
        {
          channels: ["D0GL06JD7"],
          parsedMessage: {
            channel: "D0GL06JD7",
            message: { command: "auto", params: [1] },
            team: "T0GGDKVDE",
            text: "auto 1",
            ts: "1453007224.000007",
            type: "message",
            user: "U0GG92T45"
          }
        },
        recursive_success: true
      });
      expect(dispatchMessage).to.have.been.calledThrice;
    });

    it('Should call _dispatchMessage with empty message', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = '';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith('D0GL06JD7', '', 'typing');
      expect(dispatchMessage).to.not.have.been.calledTwice;
    });

    it('Should call _dispatchMessage with wrong command', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'wrong command';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith('D0GL06JD7', '', 'typing');
      expect(dispatchMessage).to.not.have.been.calledTwice;
    });
  });

  describe('validate command type - recursive in channel', function () {
    var dispatchMessage,
      dispatchMessageEventSpy,
      slackMessage,
      slackBot;

    beforeEach(function () {

      dispatchMessage = sinon.stub(Bot.prototype, '_dispatchMessage');
      dispatchMessageEventSpy = sinon.spy();
      slackBot = new Bot(Bots.prototype._normalizeCommand(config.singleBot.bots[0]));
      slackBot.responseHandler = new ResponseHandler(config.singleBot.bots[0].botCommand, 'botname');
      slackBot.command.eventEmitter.on('command:data:respond', dispatchMessageEventSpy);
      slackBot.botName = 'botname';
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
      slackBot = null;
      slackMessage = {};
    });

    it('Should call _dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith('C0GL06JD7', '', 'typing');
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ message: { channels: ["C0GL06JD7"], data: "Hello 1" } });
      expect(dispatchMessage).to.have.been.calledTwice;
    });

    it('Should call _dispatchMessage with botname and command without param', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'botname ping';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledTwice;
      expect(dispatchMessage).to.have.been.calledWith('C0GL06JD7', '', 'typing');
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ message: { channels: ["C0GL06JD7"], data: "Hello 1" } });
    });

    it('Should not call _dispatchMessage', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'name';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
    });

    it('Should not call _dispatchMessage without botname', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'ping 1';
      Bot.prototype._handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
    });
  });
});
