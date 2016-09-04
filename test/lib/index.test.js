'use strict';

const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const uuid = require('uuid');
const root = '../../';

const botLogger = require(root + 'lib/utils/logger');
const SlackBot = require(root + 'lib/index');
const config = require(root + 'test/mock/config');
const responseHandler = require(root + 'lib/bot/response-handler');
const messageParser = require(root + 'lib/command/message');

botLogger.setLogger();

chai.use(chaiAsPromised);
chai.should();

describe('SlackBot test', function () {
  describe('single bot', function () {

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

    describe('Should instantiate slackbots correctly', function () {

      it('Should contain all the basic config', function () {
        testBots.config.slack.should.be.ok;
        testBots.config.bots.should.be.ok;
      });

      it('Should be able send and receive message', function (done) {
        Promise.resolve(testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        })).should.eventually.equal('Hello 1').and.notify(done);
      });

    });

  });

  describe('multiple bot', function () {

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
      testBots = new SlackBot(config.multipleBot, { isMock: true });
      errorContext = {
        error: true
      };
    });

    afterEach(function () {
      testBots.shutdown();
    });

    describe('Should instantiate slackbots correctly', function () {

      it('Should contain all the basic config', function () {
        testBots.config.slack.should.be.ok;
        testBots.config.bots.should.be.ok;
      });

      it('Should be able send and receive message for all bots', function (done) {
        Promise.all([
          testBots.start().then(function () {
          return testBots.bots[0].events.input(JSON.stringify(slackMessage));
        }),
        testBots.start().then(function () {
          return testBots.bots[1].events.input(JSON.stringify(slackMessage));
        })]).then (function (values) {
          values.should.be.deep.equal([ 'Hello 1', 'Hello 1' ]);
          done();
        });
      });

    });

  });
});
