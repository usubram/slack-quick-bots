/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

const external = {};

external.logger = console; // default logger to console

external.setLogger = function (logger) {
  external.logger = logger || console;
  return external;
};

exports = module.exports = external;
