'use strict';

import { Storage } from '../../../lib/storage/storage.js';

describe('/storage', function () {
  describe('validate if read event is called on bootstrap', function () {
    beforeEach(function () {
      jest.spyOn(Storage, 'updateEvents');
      jest.spyOn(Storage, 'removeEvents');

      jest.spyOn(Storage, 'readFile').mockResolvedValue({});
      jest.spyOn(Storage, 'writeFile').mockImplementation((fileType, data) => {
        return Promise.resolve(data);
      });
    });

    it('Should update events correctly', function () {
      return Storage.updateEvents(
        {
          eventType: 'events',
          botName: 'newBot',
        },
        {}
      ).then(() => {
        expect(Storage.readFile).toHaveBeenCalledTimes(1);
      });
    });

    it('Should remove events correctly', function () {
      return Storage.removeEvents('newBot', 'events', {}).then(() => {
        expect(Storage.readFile).toHaveBeenCalledTimes(1);
      });
    });
  });
});
