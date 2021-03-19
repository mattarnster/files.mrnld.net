const express = require('express')
const { getDb } = require('../db')
var router = express.Router()

var db = getDb()

router.get('/', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You need to log in to perform this action.')
        return res.redirect('/')
    } else {
        db.all('SELECT rowid,userId,fileName,uploadId,mimeType,password FROM uploads WHERE userId=?', req.session.user_id, (err, rows) => {
            return res.render('my-files', { files: rows })
        })
    }
})

module.exports = router

