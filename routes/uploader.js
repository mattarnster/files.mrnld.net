const express = require('express')
const Jimp = require('jimp')
const nanoid = require('nanoid')
const bcrypt = require('bcrypt')
const { getDb } = require('../db')
var router = express.Router()

const saltRounds = 12

var db = getDb()

async function saveThumbnail(imageName) {
    return new Promise(function (resolve, reject) {
        Jimp.read('./uploads/' + imageName, (err, file) => {
            if (err) {
                console.log(err)
            }
            resolve(file.resize(200, Jimp.AUTO))
        })
    })
}

router.post('/', async (req, res) => {
    if (!req.session.logged_in) {
        return res.status(401).send({
            status: false,
            message: 'Unauthorized'
        })
    }
    try {
        if (!req.files) {
            res.send({
                status: false,
                message: 'No file uploaded'
            });
        } else {
            //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
            let upload = req.files.file

            let library = req.body.library

            if (library === 'default') {
                library = null
            }

            //Use the mv() method to place the upload in upload directory (i.e. "uploads")
            await upload.mv('./uploads/' + upload.name);

            let hasThumbnail = false 

            if (upload.mimetype == 'image/png' || upload.mimetype == 'image/jpeg') {
                let thumbnail = await saveThumbnail(upload.name)
                thumbnail.write('./uploads/' + 'thumbnail-' + upload.name)
                hasThumbnail = true
            }

            let uploadId = nanoid.nanoid();

            let stmt = db.prepare('INSERT INTO uploads VALUES (?, ?, ?, ?, ?, ?, ?)');
            stmt.run(null, req.session.user_id, upload.name, uploadId, upload.mimetype, null, (library ? library: null));
            stmt.finalize();

            //send response
            res.send({
                status: true,
                data: {
                    uploadId: uploadId,
                    hasThumbnail: hasThumbnail
                }
            });
        }
    } catch (err) {
        console.error(err)
        res.status(500).send(err);
    }
});

router.post('/setpassword', async (req, res) => {
    // Verify the user is logged in
    // Verify the current user owns the upload
    // Save the password against the upload
    if (!req.session.logged_in) {
        res.send({
            status: false,
            message: 'Unauthorized'
        }, 401)
    } else {
        db.get('SELECT uploadId, userId FROM uploads WHERE uploadId=? AND userId=?',
            req.body.uploadId,
            req.session.user_id,
            (err, row) => {
                if (err) return res.send({
                    status: false,
                    message: "Internal server error"
                }, 500)

                if (row) {
                    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
                        if (err) {
                            return res.send({
                                status: false,
                                message: 'Internal server error'
                            }, 500)
                        }
                        var stmt = db.prepare("UPDATE uploads SET password=? WHERE uploadId=?")
                        stmt.run(hash, req.body.uploadId)
                        stmt.finalize()

                        return res.send({
                            status: true,
                            message: 'Password set'
                        })
                    })
                } else {
                    res.send({
                        status: false,
                        message: 'Unauthorized operation'
                    }, 401)
                }
            }
        )
    }
})

module.exports = router