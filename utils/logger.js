const external = {};

external.logger = console; // default logger to console

external.setLogger = function (logger) {
  external.logger = logger || console;
  return external;
};

exports = module.exports = external;
