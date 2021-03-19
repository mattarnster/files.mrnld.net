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
        res.render('login', { csrfToken: req.csrfToken() })
    } else {
        res.render('index', { csrfToken: req.csrfToken(), isAdmin: (req.session.user_id == 1 ? true : false) })
    }
})

module.exports = router