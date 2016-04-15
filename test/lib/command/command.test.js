'use strict';

const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;
const sinonChai = require('sinon-chai');
const _ = require('lodash');
const rewire = require('rewire');
const Command = rewire('./../../../lib/command/command');
const CommandInternal = rewire('./../../../lib/command/command').__get__('internals');
const botsInternal = rewire('./../../../lib/bot/bots').__get__('internals');
const message = require('./../../../lib/command/message');
const config = require('../../mock/config');

chai.use(sinonChai);

describe.only('/command', function () {

  describe('validateCommand', function () {

    describe('isAllowedParamValid', function () {

      var botCommand,
        slackMessage;

      beforeEach(function () {
        botsInternal.normalizeCommand(config.singleBotForAllowedParam.bots[0]);
        botCommand = new Command(config.singleBotForAllowedParam.bots[0].botCommand);
        botCommand.slackData = {
          users: [{ id: 'U0GG92T45', name: 'user1' },
          { id: 'U0GG92T46', name: 'user2' }]
        };
        slackMessage = {
          type: 'message',
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'ping',
          ts: '1453007224.000007',
          team: 'T0GGDKVDE'
        };
      });

      afterEach(function () {
        botCommand = undefined;
        slackMessage = {};
      });

      it('Should pass command vaidation with default value', function () {
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err).to.be.undefined;
        });
      });

      it('Should pass command vaidation with value 1', function () {
        slackMessage.text = 'ping 1';
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err).to.be.undefined;
        });
      });

      it('Should pass command vaidation with value 2', function () {
        slackMessage.text = 'ping 2';
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err).to.be.undefined;
        });
      });

      it('Should fail command vaidation with value 3', function () {
        slackMessage.text = 'ping 3';
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          console.log('err', err);
          expect(err.param).to.be.eq(true);
        });
      });
    });

    describe('isLimitValid', function () {

      var botCommand,
        slackMessage;

      beforeEach(function () {
        botsInternal.normalizeCommand(config.singleBotForAllowedParam.bots[0]);
        botCommand = new Command(config.singleBotForAllowedParam.bots[0].botCommand);
        botCommand.slackData = {
          users: [{ id: 'U0GG92T45', name: 'user1' },
          { id: 'U0GG92T46', name: 'user2' }]
        };
        slackMessage = {
          type: 'message',
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'pingLimit',
          ts: '1453007224.000007',
          team: 'T0GGDKVDE'
        };
      });

      afterEach(function () {
        botCommand = undefined;
        slackMessage = {};
      });

      it('Should pass command vaidation with default value', function () {
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err).to.be.undefined;
        });
      });

      it('Should pass command vaidation with value 1', function () {
        slackMessage.text = 'pingLimit 1';
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err).to.be.undefined;
        });
      });

      it('Should pass command vaidation with value 2', function () {
        slackMessage.text = 'pingLimit 2';
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err).to.be.undefined;
        });
      });

      it('Should fail command vaidation with value 30', function () {
        slackMessage.text = 'pingLimit 30';
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err.limit).to.be.eq(true);
        });
      });
    });

    describe('isLimitValid and isAllowedParamValid', function () {

      var botCommand,
        slackMessage;

      beforeEach(function () {
        botsInternal.normalizeCommand(config.singleBotForAllowedParam.bots[0]);
        botCommand = new Command(config.singleBotForAllowedParam.bots[0].botCommand);
        botCommand.slackData = {
          users: [{ id: 'U0GG92T45', name: 'user1' },
          { id: 'U0GG92T46', name: 'user2' }]
        };
        slackMessage = {
          type: 'message',
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'hybrid',
          ts: '1453007224.000007',
          team: 'T0GGDKVDE'
        };
      });

      afterEach(function () {
        botCommand = undefined;
        slackMessage = {};
      });

      it('Should pass command vaidation with default value', function () {
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err).to.be.undefined;
        });
      });

      it('Should pass command vaidation with value 1', function () {
        slackMessage.text = 'hybrid 1';
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err).to.be.undefined;
        });
      });

      it('Should pass command vaidation with value 2', function () {
        slackMessage.text = 'hybrid 2';
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err).to.be.undefined;
        });
      });

      it('Should fail command vaidation with value 30', function () {
        slackMessage.text = 'hybrid 30';
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err.limit).to.be.eq(true);
        });
      });
    });

    describe('isCommandAllowed', function () {

      var botCommand,
        slackMessage;

      beforeEach(function () {
        botsInternal.normalizeCommand(config.singleBotForAllowedParam.bots[0]);
        botCommand = new Command(config.singleBotForAllowedParam.bots[0].botCommand);
        botCommand.slackData = {
          users: [{ id: 'U0GG92T45', name: 'user1' },
          { id: 'U0GG92T46', name: 'user2' }]
        };
        slackMessage = {
          type: 'message',
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'pingLimit',
          ts: '1453007224.000007',
          team: 'T0GGDKVDE'
        };
      });

      afterEach(function () {
        botCommand = undefined;
        slackMessage = {};
      });

      it('Should pass command vaidation with default value', function () {
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err).to.be.undefined;
        });
      });

      it('Should pass command vaidation with value 1', function () {
        slackMessage.text = 'pingLimit 1';
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err).to.be.undefined;
        });
      });

      it('Should pass command vaidation with value 2', function () {
        slackMessage.text = 'pingLimit 2';
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err).to.be.undefined;
        });
      });

      it('Should fail command vaidation with value 30', function () {
        slackMessage.text = 'pingLimit 30';
        botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
          expect(err.limit).to.be.eq(true);
        });
      });
    });
  });

  describe('isCommandAllowed', function () {

    var botCommand,
      slackMessage;

    beforeEach(function () {
      botsInternal.normalizeCommand(config.isCommandAllowed.bots[0]);
      botCommand = new Command(config.isCommandAllowed.bots[0].botCommand);
      botCommand.slackData = {
        users: [{ id: 'U0GG92T45', name: 'user1' },
        { id: 'U0GG92T46', name: 'user2' }]
      };

      slackMessage = {
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T46',
        text: 'ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE'
      };
    });

    afterEach(function () {
      botCommand = {};
      slackMessage = {};
    });

    it('Should block user and respond error', function () {
      botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
        expect(err.restricted_user).to.be.eq(true);
      });
    });

    it('Should respond to messages for allowed user', function () {
      slackMessage.user = 'U0GG92T45';
      botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
        expect(err).to.be.undefined;
      });
    });

    it('Should not error out if the user is not found', function () {
      slackMessage.user = 'U0GG92T47';
      botCommand.validateCommand(message.parse(slackMessage, true), function (err) {
        expect(err).to.be.undefined;
      });
    });

  });

  describe('Test command types', function () {

    var botCommand,
      getData,
      setUpRecursiveTask,
      killTask,
      alertTask,
      slackMessage;

    beforeEach(function () {
      botsInternal.normalizeCommand(config.commandTypeBots.bots[0]);
      botCommand = new Command(config.commandTypeBots.bots[0].botCommand);
      botCommand.slackData = {
        users: [{ id: 'U0GG92T45', name: 'user1' },
        { id: 'U0GG92T46', name: 'user2' }]
      };
      getData = sinon.spy();
      setUpRecursiveTask = sinon.spy();
      killTask = sinon.spy();
      alertTask = sinon.spy();
      Command.__set__('internals.getData', getData);
      Command.__set__('internals.setUpRecursiveTask', setUpRecursiveTask);
      Command.__set__('internals.killTask', killTask);
      Command.__set__('internals.handleAlertTask', alertTask);

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
      slackMessage = {};
      botCommand = {};
    });

    it('Should call getData for data command', function () {
      slackMessage.text = 'ping';
      botCommand.respondToCommand(message.parse(slackMessage, true));
      expect(getData).to.have.been.calledOnce;
    });

    it('Should call setUpRecursiveTask for recursive command', function () {
      slackMessage.text = 'auto';
      botCommand.respondToCommand(message.parse(slackMessage, true));
      expect(setUpRecursiveTask).to.have.been.calledOnce;
    });

    it('Should call killTask for kill command', function () {
      slackMessage.text = 'stop';
      botCommand.respondToCommand(message.parse(slackMessage, true));
      expect(killTask).to.have.been.calledOnce;
    });

    it('Should call alertTask for alert command', function () {
      slackMessage.text = 'alert';
      botCommand.respondToCommand(message.parse(slackMessage, true));
      expect(alertTask).to.have.been.calledOnce;
    });

  });
});