const express = require('express')
const bcrypt = require('bcrypt')
const { getDb } = require('../db')

var router = express.Router()

var db = getDb()

router.post('/login', async (req, res) => {
    if (req.session.logged_in) {
        res.redirect('/')
    } else {
        db.get('SELECT rowid, email, password FROM users WHERE email=?', req.body.email, (err, row) => {
            if (err) {
                res.flash('failure', 'Login error')
                res.redirect('/')
            } else if (row) {
                bcrypt.compare(req.body.password, row.password, function (err, result) {
                    if (result) {
                        req.session.logged_in = true
                        req.session.user = row.email
                        req.session.user_id = row.rowid
                        req.flash('success', "You're logged in!")
                        res.redirect('/')
                    } else {
                        req.flash('failure', 'Invalid email/password')
                        res.redirect('/')
                    }
                })
            } else {
                req.flash('failure', 'Invalid email/password')
                res.redirect('/')
            }
        });
    }
})

router.post('/logout', async (req, res) => {
    if (req.session.logged_in) {
        req.session.logged_in = false
        req.session.user = null
        req.flash('success', 'Logged out.')
        res.redirect('/')
    }
})

module.exports = router