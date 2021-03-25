const sqlite3 = require('sqlite3').verbose();
const { table } = require('console');
const fs = require('fs')

let _db

async function initDb() {
    try {
        _db = new sqlite3.Database('./db/files.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err) => {
            if (err) {
                console.log('[DB] Error creating/opening db file, check permissions')
            } else {
                console.log('[DB] Checking table schemas...')
                _db.serialize(async function () {
                    _db.all("select name from sqlite_master where type='table'", async function (err, tables) {
                        for (var table in tables) {
                            console.log('[DB] Found table: ' + table)
                        }
                        if (tables.length === 0) {
                            // There are no tables in the database, start migrations
                            let migrations = fs.readFile('./tables.json', 'utf-8', (async (err, data) => {
                                let json = JSON.parse(data)
                                json.forEach(dbVersion => {
                                    console.log(`[DB] Doing migrations for version: ${dbVersion.version}`)
                                    
                                    dbVersion.tables.forEach(table => {
                                        _db.exec(table.up)
                                    })

                                    _db.all('SELECT version FROM migrations LIMIT 1', async (err, row) => {
                                        if (row.length === 0) {
                                            var stmt = _db.prepare('INSERT INTO migrations VALUES (?,?)')
                                            stmt.run(null, dbVersion.version, async (err, rows) => {
                                                if (err) {
                                                    console.log(err)
                                                }
                                            })
                                        } else {
                                            var stmt = _db.prepare('UPDATE migrations SET version=?')
                                            stmt.run(dbVersion.version)
                                            console.log(`[DB] Updated database version to ${dbVersion.version}`)
                                        }
                                    })
                                })
                            }))
                        } else {
                            console.log('[DB] Found existing tables, checking versions...')
                            let migrations = fs.readFile('./tables.json', 'utf-8', (async (err, data) => {
                                let json = JSON.parse(data)
                                var latestVersion = json[json.length - 1].version
                                var dbVersion
                                await _db.get('SELECT version FROM migrations LIMIT 1', async (err, row) => {
                                    if (!row) {
                                        console.log('[DB] Migrations table doesn\'t exist or there are no records in it')
                                        await _db.run('CREATE TABLE IF NOT EXISTS migrations(id INT PRIMARY KEY ASC,version INT)')
                                        dbVersion = 0
                                    }
                                    dbVersion = row.version ?? 0
                                    console.log(`[DB] Latest migration version is: ${latestVersion}, compared to ${row.version}`)
                                    while (latestVersion > dbVersion) {
                                        dbVersion++
                                        console.log(`[DB] Applying migration version ${dbVersion}`)
                                        json[dbVersion].tables.forEach(table => {
                                            _db.exec(table.up)
                                        })
                                        var stmt = _db.prepare('UPDATE migrations SET version=?')
                                        stmt.run(dbVersion)
                                    }
                                })
                            }))
                        }
                    });
                });
            }
        });
    } catch (ex) {
        console.log('[DB] No DB file found or permissions not correct.')
    }
   
}

function getDb() {
    if (!_db) {
        initDb();
    }

    return _db;
}

module.exports = {
    initDb,
    getDb
}
