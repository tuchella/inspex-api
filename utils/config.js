const PropertiesReader = require('properties-reader');

class Config {
    constructor(path) {
        const configFile = path;
        console.log(path);
        this.reader = new PropertiesReader(configFile);
    }
    get(key) {
        return this.reader.get(key)
    }   
    has(key) {
        return this.get(key) != undefined
    }
    getGroup(root) {
        const group = {};
        const rootLen = root.length + 1;
        this.reader.each((k,v) => {
            if (k.startsWith(root + ".")) {
                group[k.substring(rootLen)] = v;
            }
        });
        return group;
    }
    includes(stat) {
        return this.has(`include.${stat.type}.${stat.composition}`);
    }
}

module.exports = Config;