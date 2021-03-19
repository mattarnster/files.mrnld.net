const sqlite3 = require('sqlite3').verbose();

let _db

function initDb() {
    _db = new sqlite3.Database('./db/files.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            exit();
        }
        console.log('Connected to the files database.');
    });
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
