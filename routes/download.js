const express = require('express')
const path = require('path')
const bcrypt = require('bcrypt')
const { getDb } = require('../db')

var router = express.Router()

var db = getDb()

router.get('/:id', async (req, res) => {
    db.get('SELECT uploadId, fileName, password FROM uploads WHERE uploadId=?', req.params.id, (err, row) => {
        if (err) {
            res.render('404')
        } else {
            if (!row) {
                res.render('404')
            } else if (row.password == null) {
                res.download(path.join('uploads', row.fileName), row.fileName)
            } else if (row.password !== null) {
                res.render('password-protection', { uploadId: req.params.id, csrfToken: req.csrfToken() })
            }
        }
    })
})

router.post('/:id', async (req, res) => {
    db.get('SELECT uploadId, fileName, password FROM uploads WHERE uploadId=?', req.params.id, (err, row) => {
        if (err) {
            return res.render('500')
        }

        if (!row) {
            return res.render(404)
        }

        bcrypt.compare(req.body.password, row.password, (err, same) => {
            if (err) {
                return res.render('500')
            } else if (same) {
                res.download(path.join('uploads', row.fileName), row.fileName)
            } else if (!same) {
                req.flash('failure', 'Invalid password')
                res.redirect('/download/' + req.params.id)
            }
        })
    })
})

module.exports = router