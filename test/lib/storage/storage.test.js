'use strict';

const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const rewire = require('rewire');
const storage = require('./../../../lib/storage/storage');
const storageRewire = rewire('./../../../lib/storage/storage');

chai.use(sinonChai);

chai.use(chaiAsPromised);
chai.should();

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
      readFileStub = sinon.spy(function (fileType) {
        return Promise.resolve({});
      });
      writeFileStub = sinon.spy(function (fileType, data) {
        return Promise.resolve(data);
      });
      storageRewire.__set__('internals.readFile', readFileStub);
      storageRewire.__set__('internals.writeFile', writeFileStub);
    });

    afterEach(function () {
      updateEventsSpy.restore();
      removeEventsSpy.restore();
    });

    it('Should update events correctly', function (done) {
      storageRewire.updateEvents('newBot', 'events', {}).then(() => {
        readFileStub.should.have.been.calledOnce;
        done();
      });
    });

    it('Should remove events correctly', function (done) {
      storageRewire.removeEvents('newBot', 'events', {}).then(() => {
        readFileStub.should.have.been.calledOnce;
        done();
      });
    });
  });

});
