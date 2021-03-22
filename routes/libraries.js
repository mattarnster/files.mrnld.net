const express = require('express')
const nanoid = require('nanoid')
const bcrypt = require('bcrypt')
const { getDb } = require('../db')
const { OPEN_READWRITE } = require('sqlite3')

var router = express.Router()

var db = getDb()

router.get('/', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You must log in to perform this operation.')
        return res.redirect('/')
    }
    var stmt = db.prepare('SELECT rowid,name,privateId,private,allowUploads FROM libraries WHERE userId=?')
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
        return res.redirect('/')
    }
    return res.render('new-library')
})

router.post('/', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You must log in to perform this operation.')
        return res.redirect('/')
    }

    if (req.body.library_name === "") {
        req.flash('failure', 'You must enter a library name')
        return res.redirect('/libraries')
    }

    if (req.body.private_library && req.body.password === "") {
        req.flash('failure', 'You must enter a password for a private library')
        return res.redirect('/libraries/new')
    }

    var stmt = db.prepare('SELECT name from libraries WHERE userId=? AND name=?')
    stmt.all(req.session.user_id, req.body.library_name, (err, rows) => {
        if (rows.length > 0) {
            req.flash('failure', 'The new library must have a unique name.')
            return res.redirect('/libraries')
        }
        
        var hashedPassword = ""
        if (req.body.private_library && req.body.password) {
            hashedPassword = bcrypt.hashSync(req.body.password, 12)
        }

        var stmt = db.prepare('INSERT INTO libraries VALUES (?,?,?,?,?,?,?)')
        stmt.run(null, req.session.user_id, req.body.library_name, nanoid.nanoid(), req.body.private_library ? 1 : 0, req.body.allow_uploads ? 1 : 0, hashedPassword, (err, row) => {
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
        return res.redirect('/')
    }

    var libraryName = "" 
    var isPrivate = false
    db.get('SELECT rowid, name, userId, private FROM libraries WHERE rowid=? AND userId=?', req.params.id, req.session.user_id, (err, row) => {
        libraryName = row.name
        isPrivate = (row.private === 1 ? true : false)

        if (isPrivate) {
            return res.render('library-password', { library: row })
        }
    
        var stmt = db.prepare('SELECT * FROM libraries JOIN uploads ON uploads.libraryId=libraries.rowid WHERE libraries.rowid=? AND uploads.userId=?;')
        stmt.all(req.params.id, req.session.user_id, (err, rows) => {
            return res.render('view-library', { files: rows, libraryName: libraryName })
        })
    }) 
})

router.post('/:id', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You must log in to perform this operation.')
        return res.redirect('/')
    }

    if (!req.body.password || req.body.password === '') {
        req.flash('failure', 'You must enter the libary password')
        return res.redirect('/libraries/' + req.params.id)
    }

    db.get('SELECT rowid,password,userId FROM libraries WHERE rowid=? AND userId=?', req.params.id, req.session.user_id, (err, row) => {
        if (row) {
            console.log(row)
            bcrypt.compare(req.body.password, row.password, (err, same) => {
                if (same) {
                    db.get('SELECT rowid, name, userId, private FROM libraries WHERE rowid=? AND userId=?', req.params.id, req.session.user_id, (err, row) => {
                        libraryName = row.name
                        isPrivate = (row.private === 1 ? true : false)
                
                        var stmt = db.prepare('SELECT * FROM libraries JOIN uploads ON uploads.libraryId=libraries.rowid WHERE libraries.rowid=? AND uploads.userId=?;')
                        stmt.all(req.params.id, req.session.user_id, (err, rows) => {
                            return res.render('view-library', { files: rows, libraryName: libraryName })
                        })
                    })   
                } else {
                    req.flash('failure', 'Invalid password')
                    return res.redirect('/libraries/' + req.params.id)
                }
            })
        }
    })
})

module.exports = router