'use strict';

const sinon = require('sinon');
const chai = require('chai'),
  expect = chai.expect;
const sinonChai = require('sinon-chai');
const _ = require('lodash');
const rewire = require('rewire');
const config = require('../../mock/config');
const storage = require('./../../../lib/storage/storage');
const storageRewire = rewire('./../../../lib/storage/storage');
const BotsRewire = rewire('./../../../lib/bot/bots');

chai.use(sinonChai);

describe('/storage', function () {

  var eventsObject = {
    'newBot': {}
  };

  describe('validate if read event is called on bootstrap', function () {
    var updateEventsSpy,
      removeEventsSpy,
      readFileStub,
      writeFileStub;

    beforeEach(function () {
      updateEventsSpy = sinon.spy(storageRewire, 'updateEvents');
      removeEventsSpy = sinon.spy(storageRewire, 'removeEvents');
      readFileStub = sinon.spy(function (fileType, callback) {
        callback(null, eventsObject);
      });
      writeFileStub = sinon.spy(function (fileType, data, callback) {
        callback(null, eventsObject);
      });
      storageRewire.__set__('internals.readFile', readFileStub);
      storageRewire.__set__('internals.writeFile', writeFileStub);
    });

    afterEach(function () {
      updateEventsSpy.restore();
      removeEventsSpy.restore();
    });

    it('Should update events correctly', function () {
      storageRewire.updateEvents('newBot', 'events', {});
      expect(readFileStub).to.have.been.calledOnce;
      expect(writeFileStub).to.have.been.calledOnce;
    });

    it('Should remove events correctly', function () {
      storageRewire.removeEvents('newBot', 'events', {});
      expect(readFileStub).to.have.been.calledOnce;
      expect(writeFileStub).to.have.been.calledOnce;
    });
  });

});
