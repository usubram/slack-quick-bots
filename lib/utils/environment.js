'use strict';

/**
* Function to get NODE_ENV.
*
* @return {object} environment set in NODE_ENV.
*/
module.exports = function () {
  if (process.env.NODE_ENV) {
    return {
      [process.env.NODE_ENV]: true,
    };
  }

  return {
    prod: true,
  };
};
