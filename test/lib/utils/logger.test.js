'use strict';

import logger from '../../../lib/utils/logger.js';

describe('Logger tests', function () {
  const mockLog = jest.fn();
  jest.spyOn(logger, 'getLog').mockReturnValue({
    log: mockLog,
    debug: mockLog,
    error: mockLog,
    info: mockLog,
  });

  beforeEach(() => {
    jest.resetModules();
  });

  describe('prod env', function () {
    beforeEach(() => {
      jest.spyOn(logger, 'getEnv').mockReturnValue({
        prod: true,
      });
    });

    it('should not log debug', function () {
      logger.debug('hello');
      expect(mockLog).toHaveBeenCalledTimes(0);
    });

    it('should log info', function () {
      logger.info('hello');
      expect(mockLog).toHaveBeenCalledTimes(1);
    });

    it('should log error', function () {
      logger.error('hello');
      expect(mockLog).toHaveBeenCalledTimes(1);
    });
  });

  describe('dev env', function () {
    beforeEach(() => {
      jest.spyOn(logger, 'getEnv').mockReturnValue({
        dev: true,
      });
    });

    it('should log debug', function () {
      logger.debug('hello');
      expect(mockLog).toHaveBeenCalledTimes(1);
    });

    it('should log info', function () {
      logger.info('hello');
      expect(mockLog).toHaveBeenCalledTimes(1);
    });
  });

  describe('test env', function () {
    beforeEach(() => {
      jest.spyOn(logger, 'getEnv').mockReturnValue({
        test: true,
      });
    });

    it('should log debug', function () {
      logger.debug('hello');
      expect(mockLog).toHaveBeenCalledTimes(0);
    });

    it('should log info', function () {
      logger.info('hello');
      expect(mockLog).toHaveBeenCalledTimes(0);
    });
  });
});
