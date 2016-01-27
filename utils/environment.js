function getEnvironment() {
  if (process.env.NODE_ENV === 'development') {
    return {dev: true};
  } else {
    return {prod: true};
  }
};

exports = module.exports = getEnvironment();
