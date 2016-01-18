'use strict';

const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;
const sinonChai = require('sinon-chai');
const _ = require('lodash');
const config = require('../../mock/config');
const message = require('./../../../lib/command/message');

chai.use(sinonChai);
describe('single bot', function () {
  var slackMessage = '';
  beforeEach(function () {
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
  });

  it('Should correctly parse direct message', function () {
    var parsedMessage = message.parse(slackMessage, true);
    slackMessage.message = {
      command: 'ping',
      params: [1]
    }
    expect(parsedMessage).to.deep.equal(slackMessage);
  });

  it('Should correctly parse direct message with more params', function () {
    slackMessage.text = 'ping 1 2 3';
    var parsedMessage = message.parse(slackMessage, true);
    slackMessage.message = {
      command: 'ping',
      params: [1, 2, 3]
    }
    expect(parsedMessage).to.deep.equal(slackMessage);
  });

  it('Should correctly parse channel message', function () {
    var parsedMessage = message.parse(slackMessage, false);
    slackMessage.message = {
      commandPrefix: 'ping',
      command: 1
    }
    expect(parsedMessage).to.deep.equal(slackMessage);
  });

  it('Should correctly parse channel message with bot name and params', function () {
    slackMessage.text = 'botname command 1 2 3';
    var parsedMessage = message.parse(slackMessage, false);
    slackMessage.message = {
      commandPrefix: 'botname',
      command: 'command',
      params: [1, 2, 3]
    }
    expect(parsedMessage).to.deep.equal(slackMessage);
  });

  it('Should correctly parse channel message with bot name and params', function () {
    slackMessage.text = 'botname command 1 2 3';
    var parsedMessage = message.parse(slackMessage, false);
    slackMessage.message = {
      commandPrefix: 'botname',
      command: 'command',
      params: [1, 2, 3]
    }
    expect(parsedMessage).to.deep.equal(slackMessage);
  });
});