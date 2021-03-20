const sqlite3 = require('sqlite3').verbose();
const fs = require('fs')

let _db

function initDb() {
    try {
        _db = new sqlite3.Database('./db/files.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                console.log('[DB] Error creating/opening db file, check permissions')
            } else {
                console.log('[DB] Checking table schemas...')
                _db.serialize(function () {
                    _db.all("select name from sqlite_master where type='table'", function (err, tables) {
                        if (tables.length === 0) {
                            let queries = fs.readFile('./schema.sql', 'utf-8', (err, data) => {
                                if (err) {
                                    console.log('[DB] Error reading schema')
                                } else {
                                    console.log('[DB] Creating initial schema')
                                    _db.exec(data)
                                }
                            })
                        } else {
                            console.log('[DB] Found existing tables')
                        }
                    });
                });
                console.log('[DB] Connected to the files database.');
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
