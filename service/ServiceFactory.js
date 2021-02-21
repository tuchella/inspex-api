const Config = require("../utils/config");
const InSpExService = require("./InSpExService");

const SERVICES = {};

exports.init = function(config) {
  config.get('main.collections').split(',').forEach(c => {
    const config = new Config(`${c}.properties`);
    const service = new InSpExService(config);
    SERVICES[c] = service;
  })
  const defaultKey = config.get('main.default');
  SERVICES['default'] = SERVICES[defaultKey];
}

exports.getDefault = function() {
  return SERVICES['default']
}

exports.getService = function(key) {
  if (key in SERVICES) {
    return SERVICES[key]
  } else {
    console.error(`Subdomain ${key} not configured. Using default configuration!`);
    return exports.getDefault();
  }
}