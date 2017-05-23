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
    let updateEventsSpy;
    let removeEventsSpy;
    let readFileStub;
    let writeFileStub;

    beforeEach(function () {
      updateEventsSpy = sinon.spy(storage, 'updateEvents');
      removeEventsSpy = sinon.spy(storage, 'removeEvents');

      readFileStub = sinon.stub(storage, 'readFile').callsFake(() => {
        return Promise.resolve({});
      });
      writeFileStub = sinon.stub(storage, 'writeFile')
        .callsFake((fileType, data) => {
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
