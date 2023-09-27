'use strict';

import { forEach } from 'lodash-es';
import { Bots } from './../../../lib/bot/bots.js';
import fixtures from '../../mock/index.js';

describe('/bots', function () {
  describe('Should instantiate bots correctly', function () {
    let slackBots;

    beforeEach(function () {
      slackBots = new Bots(fixtures.BotsTest.bots).getBots();
    });

    afterEach(function () {
      slackBots = null;
    });

    describe('Should instantiate bots correctly', function () {
      it('Should contain bot token and command for bots', function () {
        expect(slackBots).toBeTruthy();
        forEach(slackBots, function (botInfo) {
          expect(botInfo.config.botCommand).toBeTruthy();
        });
      });

      it('Should contain normalized bots', function () {
        expect(slackBots).toBeTruthy();
        forEach(slackBots, function (botInfo) {
          expect(botInfo.config.botCommand['PING-ME']).toBeTruthy();
          expect(botInfo.config.botCommand['STOP']).toBeUndefined();
        });
      });
    });
  });

  describe('Should instantiate bots correctly for recurive tasks', function () {
    let slackBots;

    beforeEach(function () {
      slackBots = new Bots(fixtures.BotsTestWithRecursiveTasks.bots).getBots();
    });

    afterEach(function () {
      slackBots = null;
    });

    describe('Should instantiate bots correctly', function () {
      it('Should contain bot token and command for bots', function () {
        expect(slackBots).toBeTruthy();
        forEach(slackBots, function (botInfo) {
          expect(botInfo.config.botCommand).toBeTruthy();
        });
      });

      it('Should contain normalized bots', function () {
        expect(slackBots).toBeTruthy();
        forEach(slackBots, function (botInfo) {
          expect(botInfo.config.botCommand['PING-ME']).toBeTruthy();
          expect(botInfo.config.botCommand['AUTODATA']).toBeTruthy();
          expect(botInfo.config.botCommand['STOP']).toBeTruthy();
          expect(botInfo.config.botCommand['STOP'].allowedParam).toEqual([
            'AUTODATA',
          ]);
        });
      });
    });
  });
});
