'use strict';

const root = '../../../';

const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const storage = require(root + 'lib/storage/storage');

chai.use(sinonChai);

chai.use(chaiAsPromised);
chai.should();

describe('/storage', function () {

  describe('validate if read event is called on bootstrap', function () {
    var updateEventsSpy,
      removeEventsSpy,
      readFileStub,
      writeFileStub;

    beforeEach(function () {
      updateEventsSpy = sinon.spy(storage, 'updateEvents');
      removeEventsSpy = sinon.spy(storage, 'removeEvents');

      readFileStub = sinon.stub(storage, 'readFile', function () {
        return Promise.resolve({});
      });
      writeFileStub = sinon.stub(storage, 'writeFile', function (fileType, data) {
        return Promise.resolve(data);
      });
    });

    afterEach(function () {
      updateEventsSpy.restore();
      removeEventsSpy.restore();
      readFileStub.restore();
      writeFileStub.restore();
    });

    it('Should update events correctly', function () {
      return storage.updateEvents('newBot', 'events', {}).then(() => {
        readFileStub.should.have.been.calledOnce;
      });
    });

    it('Should remove events correctly', function () {
      return storage.removeEvents('newBot', 'events', {}).then(() => {
        readFileStub.should.have.been.calledOnce;
      });
    });
  });
});
