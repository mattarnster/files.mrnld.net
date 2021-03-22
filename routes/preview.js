const express = require('express')
const path = require('path')
const { getDb } = require('../db')

var router = express.Router()

var db = getDb()

router.get('/:id', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You need to be logged in to view previews')
        return res.redirect('/')
    }
    db.get('SELECT uploadId, fileName, userId FROM uploads WHERE uploadId=? AND userId=?', req.params.id, req.session.user_id, (err, row) => {
        if (err) {
            res.render('404')
        } else {
            if (!row) {
                res.render('404')
            } else {
                res.sendFile(path.join('uploads', 'thumbnail-' + row.fileName), {
                    root: './'
                })
            }
        }
    })
})

module.exports = router