const express = require('express')
const nanoid = require('nanoid')
const { getDb } = require('../db')

var router = express.Router()

var db = getDb()

router.get('/', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You must log in to perform this operation.')
        res.redirect('/')
    }
    var stmt = db.prepare('SELECT rowid,name,privateId FROM libraries WHERE userId=?')
    stmt.all(req.session.user_id, (err, rows) => {
        if (rows.length === 0) {
            return res.redirect('/libraries/new')
        } else {
            return res.render('libraries', { libraries: rows })
        }
    })
})

router.get('/new', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You must log in to perform this operation.')
        res.redirect('/')
    }
    return res.render('new-library', { csrfToken: req.csrfToken() })
})

router.post('/', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You must log in to perform this operation.')
        res.redirect('/')
    }

    if (req.body.library_name === "") {
        req.flash('failure', 'You must enter a library name')
        return res.redirect('/libraries')
    }

    var stmt = db.prepare('SELECT name from libraries WHERE userId=?')
    stmt.run(req.session.user_id, (err, rows) => {
        if (rows) {
            req.flash('failure', 'The new library must have a unique name.')
            return res.redirect('/libraries')
        }

        var stmt = db.prepare('INSERT INTO libraries VALUES (?,?,?,?)')
        stmt.run(null, req.session.user_id, req.body.library_name, nanoid.nanoid(), (err, row) => {
            if (err) {
                req.flash('failure', 'Error creating library: ' + err)
                return res.redirect('/libraries')
            }

            req.flash('success', 'Library created')
            return res.redirect('/libraries')
        })
    })
})

router.get('/:id', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You must log in to perform this operation.')
        res.redirect('/')
    }
    var libraryName = "" 
    db.get('SELECT rowid, name, userId FROM libraries WHERE rowid=? AND userId=?', req.params.id, req.session.user_id, (err, row) => {
        libraryName = row.name
    })
    var stmt = db.prepare('SELECT * FROM libraries JOIN uploads ON uploads.libraryId=libraries.rowid WHERE libraries.rowid=? AND uploads.userId=?;')
    stmt.all(req.params.id, req.session.user_id, (err, rows) => {
        return res.render('view-library', { files: rows, libraryName: libraryName })
    })
})

module.exports = router