/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

function getEnvironment() {
  if (process.env.NODE_ENV) {
    return { [process.env.NODE_ENV]: true };
  } else {
    return { prod: true };
  }
}

module.exports = getEnvironment();
