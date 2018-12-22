const mysql = require('mysql');
const Promise = require('bluebird');
const { promisify } = require('util');
const cp = require('child_process');
const fs = require('fs');
const settings = require('./settings');

const connection = mysql.createConnection(settings);

const query = promisify(connection.query.bind(connection));

const mkdirAsync = promisify(fs.mkdir);

const getDbs = () => query('SHOW DATABASES')
  .then(dbs => dbs.map(({ Database }) => Database));

const exec = (cmd, options) => new Promise((resolve, reject) => {
  cp.exec(cmd, options, (err, stdout, stderr) => {
    if (err) {
      return reject(err);
    }
    return resolve({ stdout, stderr });
  });
});

const getDate = () => new Date().toISOString().substr(0, 19).replace(/\:/g, '-');

const destDir = getDate();

const mysqlDump = db => exec(`mysqldump -u${settings.user} -p${settings.password} ${db} > ${destDir}/${db}.sql`);

const filterDbs = dbs => dbs.filter(db => !['mysql', 'information_schema', 'performance_schema', 'sys'].includes(db));

const dumpDbs = dbs => Promise.map(dbs, db => mysqlDump(db));

mkdirAsync(destDir)
  .then(getDbs)
  .then(filterDbs)
  .then(dumpDbs)
  .then(() => process.exit());