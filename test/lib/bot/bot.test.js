'use strict';

const botLogger = require('./../../../lib/utils/logger');
const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;
const sinonChai = require('sinon-chai');
const _ = require('lodash');
const Bots = require('./../../../lib/bot/bots');
const storage = require('./../../../lib/storage/storage');
const Bot = require('./../../../lib/bot/bot');
const ResponseHandler = require('./../../../lib/bot/response-handler');
const config = require('../../mock/config');

botLogger.setLogger();

chai.use(sinonChai);

describe('/bot', function () {
  describe('direct message', function () {

    var dispatchMessage,
      dispatchMessageEventSpy,
      setupBotEventsStub,
      slackMessage,
      slackBot;
    beforeEach(function () {

      dispatchMessage = sinon.stub(Bot.prototype, 'dispatchMessage');
      dispatchMessageEventSpy = sinon.spy();
      setupBotEventsStub = sinon.stub(Bot.prototype, 'setupBotEvents');
      slackBot = new Bots(config.singleBot.bots).getBots()[0];
      slackBot.botName = 'botname';
      slackBot.responseHandler = new ResponseHandler(config.singleBot.bots[0].botCommand, 'botname');
      slackBot.command.eventEmitter.on('command:data:respond', dispatchMessageEventSpy);
      slackBot.command.slackData = {
        users: [{ id: 'U0GG92T45', name: 'user1' },
        { id: 'U0GG92T46', name: 'user2' }]
      };
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

    it('Should call dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith({ channels: 'D0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ channels: ["D0GL06JD7"], message: { data: "Hello 1" } });
      expect(dispatchMessage).to.have.been.calledTwice;
    });

    it('Should call dispatchMessage with empty message', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = '';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith({ channels: 'D0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessage).to.not.have.been.calledTwice;
    });

    it('Should call dispatchMessage with wrong command', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'wrong command';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith({ channels: 'D0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessage).to.not.have.been.calledTwice;
    });

  });

  describe('channel message', function () {
    var dispatchMessage,
      dispatchMessageEventSpy,
      slackMessage,
      slackBot;

    beforeEach(function () {

      dispatchMessage = sinon.stub(Bot.prototype, 'dispatchMessage');
      dispatchMessageEventSpy = sinon.spy();
      slackBot = new Bots(config.singleBot.bots).getBots()[0];
      slackBot.responseHandler = new ResponseHandler(config.singleBot.bots[0].botCommand, 'botname');
      slackBot.command.eventEmitter.on('command:data:respond', dispatchMessageEventSpy);
      slackBot.botName = 'botname';
      slackBot.command.slackData = {
        users: [{ id: 'U0GG92T45', name: 'user1' },
        { id: 'U0GG92T46', name: 'user2' }]
      };
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

    it('Should call dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith({ channels: 'C0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ channels: ["C0GL06JD7"], message: { data: "Hello 1" } });
      expect(dispatchMessage).to.have.been.calledTwice;
    });

    it('Should call dispatchMessage with botname and command without param', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'botname ping';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledTwice;
      expect(dispatchMessage).to.have.been.calledWith({ channels: 'C0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ channels: ["C0GL06JD7"], message: { data: "Hello 1" } });
    });

    it('Should not call dispatchMessage', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'name';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
    });

    it('Should not call dispatchMessage without botname', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'ping 1';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
    });

    it('Should show help message for message starting with botname and wrong command', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'botname wrong command';

      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

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

      dispatchMessage = sinon.stub(Bot.prototype, 'dispatchMessage');
      dispatchMessageEventSpy = sinon.spy();
      setupBotEventsStub = sinon.stub(Bot.prototype, 'setupBotEvents');
      slackBot = new Bots(config.singleBot.bots).getBots()[0];
      slackBot.botName = 'botname';
      slackBot.responseHandler = new ResponseHandler(config.singleBot.bots[0].botCommand, 'botname');
      slackBot.command.eventEmitter.on('command:data:respond', dispatchMessageEventSpy);
      slackBot.command.slackData = {
        users: [{ id: 'U0GG92T45', name: 'user1' },
        { id: 'U0GG92T46', name: 'user2' }]
      };
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

    it('Should call dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith({ channels: 'D0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ channels: ["D0GL06JD7"], message: { data: "Hello 1" } });
      expect(dispatchMessage).to.have.been.calledTwice;
    });

    it('Should call dispatchMessage with empty message', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = '';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith({ channels: 'D0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessage).to.not.have.been.calledTwice;
    });

    it('Should call dispatchMessage with wrong command', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'wrong command';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith({ channels: 'D0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessage).to.not.have.been.calledTwice;
    });
  });

  describe('validate command type - data in channel', function () {
    var dispatchMessage,
      dispatchMessageEventSpy,
      slackMessage,
      slackBot;

    beforeEach(function () {

      dispatchMessage = sinon.stub(Bot.prototype, 'dispatchMessage');
      dispatchMessageEventSpy = sinon.spy();
      slackBot = new Bots(config.singleBot.bots).getBots()[0];
      slackBot.responseHandler = new ResponseHandler(config.singleBot.bots[0].botCommand, 'botname');
      slackBot.command.eventEmitter.on('command:data:respond', dispatchMessageEventSpy);
      slackBot.botName = 'botname';
      slackBot.command.slackData = {
        users: [{ id: 'U0GG92T45', name: 'user1' },
        { id: 'U0GG92T46', name: 'user2' }]
      };
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

    it('Should call dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith({ channels: 'C0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ channels: ["C0GL06JD7"], message: { data: "Hello 1" } });
      expect(dispatchMessage).to.have.been.calledTwice;
    });

    it('Should call dispatchMessage with botname and command without param', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'botname ping';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledTwice;
      expect(dispatchMessage).to.have.been.calledWith({ channels: 'C0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ channels: ["C0GL06JD7"], message: { data: "Hello 1" } });
    });

    it('Should not call dispatchMessage', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'name';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
    });

    it('Should not call dispatchMessage without botname', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'ping 1';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

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

      dispatchMessage = sinon.stub(Bot.prototype, 'dispatchMessage');
      dispatchMessageEventSpy = sinon.spy();
      setupBotEventsStub = sinon.stub(Bot.prototype, 'setupBotEvents');
      slackBot = new Bots(config.singleBot.bots).getBots()[0];
      slackBot.botName = 'botname';
      slackBot.responseHandler = new ResponseHandler(config.singleBot.bots[0].botCommand, 'botname');
      slackBot.command.eventEmitter.on('command:setup:recursive', dispatchMessageEventSpy);
      slackBot.command.slackData = {
        users: [{ id: 'U0GG92T45', name: 'user1' },
        { id: 'U0GG92T46', name: 'user2' }]
      };
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

    it('Should call dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith({ channels: 'D0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessageEventSpy).to.have.been.calledWith(
        {
          message: {
            recursive_success: true
          },
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
        }
      );
      expect(dispatchMessage).to.have.been.calledThrice;
    });

    it('Should call dispatchMessage with empty message', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = '';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith({ channels: 'D0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessage).to.not.have.been.calledTwice;
    });

    it('Should call dispatchMessage with wrong command', function () {
      expect(slackBot).to.be.ok;
      slackMessage.text = 'wrong command';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.calledWith({ channels:'D0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessage).to.not.have.been.calledTwice;
    });
  });

  describe('validate command type - recursive in channel', function () {
    var dispatchMessage,
      dispatchMessageEventSpy,
      slackMessage,
      slackBot;

    beforeEach(function () {

      dispatchMessage = sinon.stub(Bot.prototype, 'dispatchMessage');
      dispatchMessageEventSpy = sinon.spy();
      slackBot = new Bots(config.singleBot.bots).getBots()[0];
      slackBot.responseHandler = new ResponseHandler(config.singleBot.bots[0].botCommand, 'botname');
      slackBot.command.eventEmitter.on('command:data:respond', dispatchMessageEventSpy);
      slackBot.botName = 'botname';
      slackBot.command.slackData = {
        users: [{ id: 'U0GG92T45', name: 'user1' },
        { id: 'U0GG92T46', name: 'user2' }]
      };
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

    it('Should call dispatchMessage with correct arguments', function () {
      expect(slackBot).to.be.ok;
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledWith({ channels:'C0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ channels: ["C0GL06JD7"], message: { data: "Hello 1" } });
      expect(dispatchMessage).to.have.been.calledTwice;
    });

    it('Should call dispatchMessage with botname and command without param', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'botname ping';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.have.been.calledTwice;
      expect(dispatchMessage).to.have.been.calledWith({ channels:'C0GL06JD7', message: '', type: 'typing' });
      expect(dispatchMessageEventSpy).to.have.been.calledWith({ channels: ["C0GL06JD7"], message: { data: "Hello 1" } });
    });

    it('Should not call dispatchMessage', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'name';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
    });

    it('Should not call dispatchMessage without botname', function () {
      expect(slackBot).to.be.ok;
      slackBot.botName = 'botname';
      slackMessage.text = 'ping 1';
      Bot.prototype.handleMessage.apply(slackBot, [slackMessage]);

      expect(dispatchMessage).to.not.have.been.called;
    });
  });

  describe('validate if read event is called on bootstrap', function () {
    var slackBot,
      getEventsSpy;

    beforeEach(function () {
      getEventsSpy = sinon.spy(storage, 'getEvents');
      slackBot = new Bots(config.singleBot.bots).getBots()[0];
    });

    afterEach(function () {
      slackBot = undefined;
      getEventsSpy.restore();
    });

    it('Should ', function () {
      slackBot.eventEmitter.emit('attachSocket', { ws: { on: _.noop }, slackData:
        { url: 'hello', self: { name: 'botName', id: 'botName' } }
      });
      expect(getEventsSpy).to.have.been.calledOnce;
    });
  });
});
