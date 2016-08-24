'use strict';

const _ = require('lodash');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const uuid = require('uuid');
const root = '../../../';

const botLogger = require(root + 'lib/utils/logger');
const SlackBot = require(root + 'lib/index');
const config = require(root + 'test/mock/config');
const responseHandler = require(root + 'lib/bot/response-handler');
const messageParser = require(root + 'lib/command/message');

botLogger.setLogger();

chai.use(chaiAsPromised);
chai.should();

describe('/bot.js', function () {
  describe('direct message', function () {

    var testBots;
    var errorContext;
    var slackMessage = {
      id: uuid.v4(),
      type: 'message',
      channel: 'D0GL06JD7',
      user: 'U0GG92T45',
      text: 'ping 1',
      team: 'T0GGDKVDE'
    };

    beforeEach(function () {
      testBots = new SlackBot(config.singleBot, { isMock: true });
      errorContext = {
        error: true
      };
    });

    afterEach(function () {
      testBots.shutdown();
    });

    it('Should with the expected response', function (done) {
      slackMessage.text = 'ping 1';
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal('Hello 1').and.notify(done);
    });

    it('Should respond with empty message', function (done) {
      slackMessage.text = '';
      errorContext.parsedMessage = messageParser.parse(slackMessage, true);
      var errorMessage = responseHandler
        .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal(errorMessage).and.notify(done);
    });

    it('Should respond with error message', function (done) {
      slackMessage.text = 'wrong command';
      errorContext.parsedMessage = messageParser.parse(slackMessage, true);
      var errorMessage = responseHandler
        .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);
      testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      }).then(function (response){
        Promise.resolve(response).should.eventually.equal(errorMessage).and.notify(done)
      });
    });

  });

  describe('channel message', function () {

    var testBots;
    var errorContext;
    var slackMessage = {
      id: uuid.v4(),
      type: 'message',
      channel: 'C0GL06JD7',
      user: 'U0GG92T45',
      text: 'testbot1 ping 1',
      team: 'T0GGDKVDE'
    };

    beforeEach(function () {
      testBots = new SlackBot(config.singleBot, { isMock: true });
      errorContext = {
        error: true
      };
    });

    afterEach(function () {
      testBots.shutdown();
    });

    it('Should call dispatchMessage with correct arguments', function (done) {
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal('Hello 1').and.notify(done);
    });

    it('Should call dispatchMessage with botname and command without param', function (done) {
      slackMessage.text = 'testbot1 ping';
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal('Hello 1').and.notify(done);
    });

    it('Should not call dispatchMessage', function (done) {
      slackMessage.text = 'hello';
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal(undefined).and.notify(done);
    });

    it('Should not call dispatchMessage without botname', function (done) {
      slackMessage.text = 'ping 1';
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal(undefined).and.notify(done);
    });

    it('Should show help message for message starting with botname and wrong command', function (done) {
      slackMessage.text = 'testbot1 wrong command';
      errorContext.parsedMessage = messageParser.parse(slackMessage);
      var errorMessage = responseHandler
        .generateErrorTemplate('testbot1', testBots.bots[0].config.botCommand, errorContext);
      Promise.resolve(testBots.start().then(function () {
        return testBots.bots[0].events.input(JSON.stringify(slackMessage));
      })).should.eventually.equal(errorMessage).and.notify(done);
    });
  });

});
