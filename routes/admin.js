const express = require('express')
const bcrypt = require('bcrypt')
const { getDb } = require('../db')

const saltRounds = 12

var router = express.Router()

var db = getDb()

router.get('/', async (req, res) => {
    if (!req.session.logged_in || req.session.user_id !== 1) {
        req.flash('failure', 'You need to log in to view this page.')
        res.redirect('/')
    } else {
        db.all('SELECT email,verified FROM users', (err, rows) => {
            if (rows) {
                res.render('admin', { users: rows })
            }
        })
    }
})

router.get('/add-user', async (req, res) => {
    if (!req.session.logged_in || req.session.user_id !== 1) {
        req.flash('failure', 'You need to log in to perform this action.')
        res.redirect('/')
    } else {
        res.render('add-user', { csrfToken: req.csrfToken() })
    }
})

router.post('/add-user', async (req, res) => {
    if ((!req.session.logged_in || req.session.user_id !== 1) && !req.session.setup) {
        req.flash('failure', 'You need to log in to perform this action.')
        res.redirect('/')
    } else if (req.session.logged_in || req.session.setup) {
        let { email, password, confirm_password } = req.body
        if (!email || !password || !confirm_password) {
            req.flash('failure', 'All values should be filled in')
            res.redirect('/admin/add-user')
        } else if (password !== confirm_password) {
            req.flash('failure', 'Password and confirmed password should match')
            res.redirect('/admin/add-user')
        } else {
            bcrypt.hash(password, saltRounds, (err, hash) => {
                if (err) {
                    req.flash('failure', 'Failed to hash password')
                    res.redirect('/admin/add-user')
                } else {
                    var stmt = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?)')
                    stmt.run(null, email, hash, 1, (err, rows) => {
                        if (err) {
                            req.flash('failure', 'Failed to insert into database.')
                            res.redirect('/admin/add-user')
                        } else {
                            req.session.setup = false
                            req.flash('success', 'New user added')
                            res.redirect('/admin')
                        }
                    })
                }
            })
        }
    }
})

module.exports = router