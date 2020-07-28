'use strict';

const storage = require('../../../lib/storage/storage');

describe('/storage', function () {
  describe('validate if read event is called on bootstrap', function () {
    beforeEach(function () {
      jest.spyOn(storage, 'updateEvents');
      jest.spyOn(storage, 'removeEvents');

      jest.spyOn(storage, 'readFile').mockResolvedValue({});
      jest.spyOn(storage, 'writeFile').mockImplementation((fileType, data) => {
        return Promise.resolve(data);
      });
    });

    it('Should update events correctly', function () {
      return storage
        .updateEvents(
          {
            eventType: 'events',
            botName: 'newBot',
          },
          {}
        )
        .then(() => {
          expect(storage.readFile).toHaveBeenCalledTimes(1);
        });
    });

    it('Should remove events correctly', function () {
      return storage.removeEvents('newBot', 'events', {}).then(() => {
        expect(storage.readFile).toHaveBeenCalledTimes(1);
      });
    });
  });
});
