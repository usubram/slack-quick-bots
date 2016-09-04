'use strict';

const _ = require('lodash');
const botLogger = require('../../../lib/utils/logger');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const uuid = require('uuid');
const root = '../../../';

const SlackBot = require(root + 'lib/index');
const config = require(root + 'test/mock/config');
const responseHandler = require(root + 'lib/bot/response-handler');
const messageParser = require(root + 'lib/command/message');

botLogger.setLogger();

chai.use(chaiAsPromised);
chai.should();

describe('/command', function () {

  describe('validateCommand', function () {

    describe('isAllowedParamValid', function () {

      var testBots;
      var errorContext;
      var slackMessage;

      beforeEach(function () {
        testBots = new SlackBot(config.singleBotForAllowedParam, { isMock: true });
        errorContext = {
          error: true
        };
        slackMessage = {
          id: uuid.v4(),
          type: 'message',
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'ping',
          ts: '1453007224.000007',
          team: 'T0GGDKVDE'
        };
      });

      afterEach(function () {
        testBots.shutdown();
      });

      it('Should pass command vaidation with default value', function (done) {
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal('Hello 1').and.notify(done);
      });

      it('Should pass command vaidation with value 1', function (done) {
        slackMessage.text = 'ping 1';
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal('Hello 1').and.notify(done);
      });

      it('Should pass command vaidation with value 2', function (done) {
        slackMessage.text = 'ping 2';
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal('Hello 2').and.notify(done);
      });

      it('Should fail command vaidation with value 3', function (done) {
        slackMessage.text = 'ping 3';
        delete errorContext.error;
        errorContext.param = true;
        errorContext.parsedMessage = messageParser.parse(slackMessage, true);
        var errorMessage = responseHandler
          .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal(errorMessage).and.notify(done);
      });
    });

    describe('isLimitValid', function () {

      var testBots;
      var errorContext;
      var slackMessage;

      beforeEach(function () {
        testBots = new SlackBot(config.singleBotForAllowedParam, { isMock: true });
        errorContext = {
          error: true
        };
        slackMessage = {
          id: uuid.v4(),
          type: 'message',
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'pingLimit',
          ts: '1453007224.000007',
          team: 'T0GGDKVDE'
        };
      });

      afterEach(function () {
        testBots.shutdown();
      });

      it('Should pass command vaidation with default value', function (done) {
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal('Hello 1').and.notify(done);
      });

      it('Should pass command vaidation with value 1', function (done) {
        slackMessage.text = 'pingLimit 1';
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal('Hello 1').and.notify(done);
      });

      it('Should pass command vaidation with value 2', function (done) {
        slackMessage.text = 'pingLimit 2';
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal('Hello 2').and.notify(done);
      });

      it('Should fail command vaidation with value 30', function (done) {
        slackMessage.text = 'pingLimit 30';
        delete errorContext.error;
        errorContext.limit = true;
        errorContext.parsedMessage = messageParser.parse(slackMessage, true);
        var errorMessage = responseHandler
          .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal(errorMessage).and.notify(done);
      });
    });

    describe('isLimitValid and isAllowedParamValid', function () {

      var testBots;
      var errorContext;
      var slackMessage;

      beforeEach(function () {
        testBots = new SlackBot(config.singleBotForAllowedParam, { isMock: true });
        errorContext = {
          error: true
        };
        slackMessage = {
          id: uuid.v4(),
          type: 'message',
          channel: 'D0GL06JD7',
          user: 'U0GG92T45',
          text: 'hybrid',
          ts: '1453007224.000007',
          team: 'T0GGDKVDE'
        };
      });

      afterEach(function () {
        testBots.shutdown();
      });

      it('Should pass command vaidation with default value', function (done) {
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal('Hello 1').and.notify(done);
      });

      it('Should pass command vaidation with value 1', function (done) {
        slackMessage.text = 'hybrid 1';
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal('Hello 1').and.notify(done);
      });

      it('Should pass command vaidation with value 2', function (done) {
        slackMessage.text = 'hybrid 2';
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal('Hello 2').and.notify(done);
      });

      it('Should fail command vaidation with value 30', function (done) {
        slackMessage.text = 'hybrid 30';
        delete errorContext.error;
        errorContext.limit = true;
        errorContext.parsedMessage = messageParser.parse(slackMessage, true);
        var errorMessage = responseHandler
          .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal(errorMessage).and.notify(done);
      });
    });
  });

  describe('isCommandAllowed', function () {

    var testBots;
    var errorContext;
    var slackMessage;

    beforeEach(function () {
      testBots = new SlackBot(config.isCommandAllowed, { isMock: true });
      errorContext = {
        error: true
      };
      slackMessage = {
        id: uuid.v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T46',
        text: 'ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE'
      };
    });

    afterEach(function () {
      testBots.shutdown();
    });

    it('Should block user and respond error', function (done) {
      delete errorContext.error;
      errorContext.restricted_user = true;
      errorContext.parsedMessage = messageParser.parse(slackMessage, true);
      errorContext.users = testBots.bots[0].config.allowedUsers;
      var errorMessage = responseHandler
        .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal(errorMessage).and.notify(done);
    });

    it('Should respond to messages for allowed user', function (done) {
      slackMessage.user = 'U0GG92T45';
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal('Hello 1').and.notify(done);
    });

    it('Should not error out if the user is not found', function (done) {
      slackMessage.user = 'U0GG92T47';
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal('Hello 1').and.notify(done);
    });

  });

  describe('blockDirectMessage', function () {

    var testBots;
    var errorContext;
    var slackMessage;

    beforeEach(function () {
      testBots = new SlackBot(config.blockDirectMessage, { isMock: true });
      errorContext = {
        error: true
      };
      slackMessage = {
        id: uuid.v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T46',
        text: 'ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE'
      };
    });

    afterEach(function () {
      testBots.shutdown();
    });

    it('Should respond with blocked message on direct message', function (done) {
      delete errorContext.error;
      errorContext.bot_direct_message_error = true;
      var errorMessage = responseHandler
        .generateBotResponseTemplate(errorContext);
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal(errorMessage).and.notify(done);
    });

    it('Should respond with blocked message on private group', function (done) {
      slackMessage.channel = 'G0GL06JD7';
      delete errorContext.error;
      errorContext.bot_direct_message_error = true;
      var errorMessage = responseHandler
        .generateBotResponseTemplate(errorContext);
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal(errorMessage).and.notify(done);
    });

    it('Should respond to messages in public channel', function (done) {
      slackMessage.channel = 'C0GL06JD7';
      slackMessage.text = 'testbot1 ping 1';
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal('Hello 1').and.notify(done);
    });
  });

  describe('Test command types', function () {

    var testBots;
    var errorContext;
    var slackMessage;

    beforeEach(function () {
      testBots = new SlackBot(config.commandTypeBots, { isMock: true });
      errorContext = {
        error: true
      };
      slackMessage = {
        id: uuid.v4(),
        type: 'message',
        channel: 'D0GL06JD7',
        user: 'U0GG92T45',
        text: 'ping 1',
        ts: '1453007224.000007',
        team: 'T0GGDKVDE'
      };
    });

    afterEach(function () {
      testBots.shutdown();
    });

    it('Should call getData for data command', function (done) {
      slackMessage.text = 'ping';
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal('Hello 1').and.notify(done);
    });

    it('Should call setUpRecursiveTask for recursive command', function (done) {
      slackMessage.text = 'auto';
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal(undefined).and.notify(done);
    });

    it('Should call killTask for kill command', function (done) {
      slackMessage.text = 'stop';
      delete errorContext.error;
      errorContext.param = true;
      errorContext.parsedMessage = messageParser.parse(slackMessage, true);
      var errorMessage = responseHandler
        .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal(errorMessage).and.notify(done);
    });

    it('Should call alertTask for alert command', function (done) {
      slackMessage.text = 'alert';
      delete errorContext.error;
      errorContext.param = true;
      errorContext.parsedMessage = messageParser.parse(slackMessage, true);
      var errorMessage = responseHandler
        .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal(errorMessage).and.notify(done);
    });

  });
});