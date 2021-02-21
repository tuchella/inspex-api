'use strict';

const Database = require('../utils/database.js');
const lists = require('../utils/lists.js');

/**
 * Get supporter filters
 *
 * returns SupportedFilters
 **/
class InSpExService {

  constructor(config) {
    this.config = config;
    this.db = new Database(config);
    this.cached = null; 
  }
getFilters() {
  return new Promise(function(resolve, reject) {
    if (this.cached) {
      resolve(this.cached);
      return;
    }

    try {
      const response = {};
      
      response.stat = this.db.getStatFilters();
      if (this.config.has('include.duration')) {
        response.stat.push(this.db.getDurationRange());
      }
      response.stat.sort(lists.comparing(a => `${a.stat.type}.${a.stat.composition}`));

      const files = this.db.getAllFiles();
      response.meta = [
        {
          "key": "file",
          "values": files
        }
      ];
      this.cached = response;
      resolve(response);
    } catch (e) {
      console.log(e);
      reject(e);
    }
  }.bind(this));
}


/**
 * Run an analysis
 *
 * id String 
 * returns Slice
 **/
getSlice(id) {
  return new Promise(function(resolve, reject) {
    try {
      const res = this.db.getSlice(id);
      resolve(res);
    } catch (e) {
      console.log(e);
      reject(e);
    }
  }.bind(this));
}


/**
 * Run an analysis
 *
 * body AnalysisQuery  (optional)
 * returns List
 **/
runAnalysis(body) {
  return new Promise(function(resolve, reject) {
    try {
      const res = this.db.queryStats(body);
      resolve(res);
    } catch (e) {
      console.log(e);
      reject(e);
    }
  }.bind(this));
}
}
module.exports = InSpExService