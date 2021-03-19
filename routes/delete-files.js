const express = require('express')
const fs = require('fs')
const path = require('path')
const { getDb } = require('../db')

var router = express.Router()

var db = getDb()

router.get('/:id', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You need to log in to perform this action.')
        return res.redirect('/')
    } else {
        db.get('SELECT userId, uploadId, mimeType FROM uploads WHERE userId=? AND uploadID=?', req.session.user_id, req.params.id, (err, row) => {
            if (err) {
                req.flash('failure', 'Failed to connect to the database')
                return res.redirect('/my-files')
            } else if (!row) {
                req.flash('failure', 'File not found')
                return res.redirect('/my-files')
            } else {
                var isImage = false
                if (row.mimeType.includes('image')) {
                    isImage = true
                }
                return res.render('delete-file', { upload: row, csrfToken: req.csrfToken(), isImage: isImage })
            }
        })
    }
})

router.post('/:id', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You need to log in to perform this action.')
        res.redirect('/')
    } else {
        db.get('SELECT userId, uploadId, fileName, mimeType FROM uploads WHERE userId=? AND uploadId=?', req.session.user_id, req.params.id, (err, row) => {
            if (err) {
                req.flash('failure', 'Failed to connect to the database')
                return res.redirect('/my-files')
            } else if (!row) {
                req.flash('failure', 'File not found')
                return res.redirect('/my-files')
            } else {
                var stmt = db.prepare('DELETE FROM uploads WHERE uploadId=? AND userId=?')
                stmt.run(req.params.id, req.session.user_id, (err, rows) => {
                    if (err) {
                        req.flash('failure', 'Failed to delete file, database error occured')
                        return res.redirect('/my-files')
                    } else {
                        try {
                            fs.unlinkSync(path.join('uploads', row.fileName))
                            if (row.mimeType.includes('image')) {
                                fs.unlinkSync(path.join('uploads', 'thumbnail-' + row.fileName))
                            }
                        } catch (ex) {
                            req.flash('failure', 'File on disk couldn\'t be deleted or wasn\'t found, but was deleted from the database.')
                            return res.redirect('/my-files')
                        }
                        
                        req.flash('success', 'File deleted')
                        return res.redirect('/my-files')
                    }
                })
            }
        })
    }
})

module.exports = router