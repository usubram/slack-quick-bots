/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function getEnvironment() {
  if (process.env.NODE_ENV) {
    return _defineProperty({}, process.env.NODE_ENV, true);
  } else {
    return { prod: true };
  }
}

module.exports = getEnvironment();