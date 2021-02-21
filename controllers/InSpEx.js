'use strict';

const writer = require('../utils/writer.js');
const services = require('../service/ServiceFactory');

function getService(req) {
  if (req.subdomains) {
    return services.getService(req.subdomains[0]);
  } else {
    return services.getDefault();
  }
}

module.exports.getFilters = function getFilters (req, res, next) {
  getService(req).getFilters()
    .then(function (response) {
      writer.writeJson(res, response);
    })
    .catch(function (response) {
      writer.writeJson(res, response, 500);
    });
};

module.exports.getSlice = function getSlice (req, res, next, id) {
  getService(req).getSlice(id)
    .then(function (response) {
      if (response) {
        writer.writeJson(res, response);
      } else {
        writer.writeJson(res, null, 404);
      }
    })
    .catch(function (response) {
      writer.writeJson(res, response, 500);
    });
};

module.exports.runAnalysis = function runAnalysis (req, res, next, body) {
  getService(req).runAnalysis(body)
    .then(function (response) {
      writer.writeJson(res, response);
    })
    .catch(function (response) {
      writer.writeJson(res, response, 500);
    });
};
