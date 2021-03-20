const express = require('express')
const { getDb } = require('../db')
var router = express.Router()

var db = getDb()

router.get('/', async (req, res) => {
    db.get('SELECT * FROM users', (err, row) => {
        if (!row) {
            req.session.setup = true
        }
    })
    if (req.session.setup) {
        return res.redirect('/setup')
    }
    if (!req.session.logged_in) {
        res.render('login')
    } else {
        db.all('SELECT rowid,* FROM libraries WHERE userId=?', req.session.user_id, (err, rows) => {
            return res.render('index', { libraries: rows })
        })
    }
})

module.exports = router