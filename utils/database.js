const lists = require('./lists.js');
const Sqlite = require('better-sqlite3');

const COMPOSITIONS = [
    'mean',
    'stddev',
    'skew',
    'kurtosis',
    'min',
    'median',
    'max',
    'dmean',
    'dstddev',
    'dskew',
    'dkurtosis',
    'dmin',
    'dmedian',
    'dmax'
]

const VALID_STAT_PATTERN = RegExp('[a-z]+');


class Database {
    constructor(config) {
        this.config = config;
        const file = config.get("database.file.path");
        console.log('db file', file);
        this.db = new Sqlite(file, { verbose: console.log });
    }

    entriesIn(table) {
        return this.db.prepare('SELECT COUNT(*) AS c FROM ' + table).get().c;
    }

    getAllFiles() {
        return this.db.prepare('SELECT file FROM Slices GROUP BY file ORDER BY FILE')
            .all()
            .map(r => r.file);
    }

    getDurationRange() {
        const r = this.db.prepare('SELECT min(duration) AS min, max(duration) as max FROM Slices').get();
        return {
            "stat": {
                "type": "duration",
                "composition": "none"
            },
            "start": r.min,
            "end": r.max
        };
    }

    queryStats(query) {
        this.valideteQuery(query);

        const stats = query.stats
            .filter(r => this.config.includes(r.stat));
        const joins = lists.rmdups(stats.map(r => r.stat.type).concat([query.x.type, query.y.type, query.z.type]))
            .filter(type => type != 'duration')
            .map(type => `INNER JOIN Stats as ${type} ON ${type}.slice_id = slice.slice_id AND ${type}.stat_type = '${type}'`)
            .join(' \n');

        const meta = query.includeMeta || [];
        const metaJoins = meta
            .map((_, i) => `LEFT JOIN Meta as meta${i} ON meta${i}.slice_id = slice.slice_id AND meta${i}.type = @meta${i}`)
            .join(' \n');
        const metaSelects = meta
            .map((_, i) => `meta${i}.value as meta${i},`)
            .join(' ');

        let conds = stats.map(this.formatFilter)
            .join(' AND ');
        const params = {}
        stats.forEach(r => {
            if (r.start < r.end) {
                params[`${r.stat.type}${r.stat.composition}Min`] = r.start;
                params[`${r.stat.type}${r.stat.composition}Max`] = r.end;
            } else {
                params[`${r.stat.type}${r.stat.composition}Min`] = r.end;
                params[`${r.stat.type}${r.stat.composition}Max`] = r.start;
            }
        });
        meta.forEach((m, i) => {
            params[`meta${i}`] = m;
        });

        const sql = `SELECT slice.slice_id, slice.slice_name, slice.file, slice.duration, slice.start_pos AS start, slice.end_pos AS end,
            ${metaSelects}
            ${query.x.type}.${query.x.composition} AS x, 
            ${query.y.type}.${query.y.composition} AS y, 
            ${query.z.type}.${query.z.composition} AS z
        FROM Slices as slice
        ${joins}
        ${metaJoins}
        WHERE
            ${conds}
        ORDER BY x
        LIMIT ${query.limit}`;

        const countSql = `SELECT COUNT(*) as count FROM Slices as slice ${joins} WHERE ${conds}`

        const count = this.db.prepare(countSql).get(params).count;
        const slices = this.db.prepare(sql).all(params).map(res => {
            const slice = {
                id: res.slice_id,
                name: res.slice_name,
                file: res.file,
                duration: res.duration,
                start: res.start,
                end: res.end,
                x: res.x,
                y: res.y,
                z: res.z,
                meta: {}
            }
            meta.forEach((m, i) => {
                slice.meta[m] = res[`meta${i}`];
            });
            return slice;
        });
        console.log(`TOTAL RESULTS ${count}`);
        return slices;
    }
    formatFilter(r) {
        if (r.stat.type == 'duration') {
            return `(slice.duration BETWEEN @${r.stat.type}${r.stat.composition}Min AND @${r.stat.type}${r.stat.composition}Max)\n`;
        } else {
            return `(${r.stat.type}.${r.stat.composition} BETWEEN @${r.stat.type}${r.stat.composition}Min AND @${r.stat.type}${r.stat.composition}Max)\n`
        }
    }

    valideteQuery(query) {
        query.stats.forEach(r => this.validateStat(r.stat));
        this.validateStat(query.x);
        this.validateStat(query.y);
        this.validateStat(query.z);
    }

    validateStat(stat) {
        if (!VALID_STAT_PATTERN.test(stat.type) || !VALID_STAT_PATTERN.test(stat.composition)) {
            throw `Invalid stat ${stat.type}.${stat.composition}`;
        }
    }

    getStatFilters() {
        const includes = this.getIncludedStats();

        const query = `
            SELECT stat_type, 
            max(mean) as mean_max, min(mean) as mean_min,
            max(stddev) as stddev_max, min(stddev) as stddev_min,
            max(skew) as skew_max, min(skew) as skew_min,
            max(kurtosis) as kurtosis_max, min(kurtosis) as kurtosis_min,
            max(min) as min_max, min(min) as min_min,
            max(median) as median_max, min(median) as median_min,
            max(max) as max_max, min(max) as max_min,
            max(dmean) as dmean_max, min(dmean) as dmean_min,
            max(dstddev) as dstddev_max, min(dstddev) as dstddev_min,
            max(dskew) as dskew_max, min(dskew) as dskew_min,
            max(dkurtosis) as dkurtosis_max, min(dkurtosis) as dkurtosis_min,
            max(dmin) as dmin_max, min(dmin) as dmin_min,
            max(dmedian) as dmedian_max, min(dmedian) as dmedian_min,
            max(dmax) as dmax_max, min(dmax) as dmax_min
        FROM Stats 
        GROUP BY stat_type
        ORDER BY stat_type`;
        const result = this.db.prepare(query).all();
        const stats = []
        try {
            for (const row of result) {
                const stat_type = row.stat_type;
                for (const c of COMPOSITIONS) {
                    if (includes.includes(`${stat_type}.${c}`)) {
                        const s = {
                            "stat": {
                                "type": stat_type,
                                "composition": c
                            },
                            "start": row[`${c}_min`],
                            "end": row[`${c}_max`]
                        };
                        stats.push(s);
                    }
                }
            }
        } catch (e) {
            console.log(e);
        }
        return stats;
    }

    getIncludedStats() {
        return Object.keys(this.config.getGroup("include"));
    }


    getSlice(id) {
        const sql = `SELECT slice.slice_id, slice.slice_name, slice.file, slice.duration, slice.start_pos AS start, slice.end_pos AS end
        FROM Slices as slice
        WHERE slice_id = ?`;

        const res = this.db.prepare(sql).get(id);
        if (!res) {
            return null;
        }
        const slice = {
            id: res.slice_id,
            name: res.slice_name,
            file: res.file,
            duration: res.duration,
            start: res.start,
            end: res.end,
            meta: {}
        }

        const mSql = `SELECT type, value FROM Meta WHERE slice_id = ?`;
        const mRes = this.db.prepare(mSql).all(id);
        mRes.forEach(m => {
            slice.meta[m.type] = m.value;
        });

        return slice;
    }
}

module.exports = Database;