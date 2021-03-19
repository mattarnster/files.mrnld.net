const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const _ = require('lodash');
const { exit, env } = require('process');
const sqlite3 = require('sqlite3').verbose();
const nanoid = require('nanoid');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt')
const flash = require('connect-flash')
const exphbs = require('express-handlebars')
const csurf = require('csurf');
const Jimp = require('jimp');
const fs = require('fs');
const saltRounds = 12

const app = express();

// enable file upload
app.use(fileUpload({
    createParentPath: true
}));

//add other middleware
app.use(cors());
app.use(cookieParser())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('tiny'));

var hbs = exphbs.create({
    helpers: {
        ifEquals: function (arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this)
        },
        eq: function () {
            const args = Array.prototype.slice.call(arguments, 0, -1);
            return args.every(function (expression) {
                return args[0] === expression;
            });
        }
    }
})

app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')

app.use(session({
    store: new SQLiteStore,
    db: 'sessions.db',
    secret: 'test',
    dir: 'db',
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    resave: false,
    saveUninitialized: true,
}))

app.use(flash())
app.use((req, res, next) => {
    res.locals.success = req.flash('success')
    res.locals.failure = req.flash('failure')
    next()
})

app.use(csurf())

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

//start app 
const port = process.env.PORT || 3000;

let db = new sqlite3.Database('./db/files.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
        exit();
    }
    console.log('Connected to the files database.');
});

app.get('/', async (req, res) => {
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

app.get('/setup', async (req, res) => {
    if (!req.session.setup) {
        res.render('/')
    } else {
        res.render('add-user', { csrfToken: req.csrfToken(), setup: true })
    }
})

app.get('/admin', async (req, res) => {
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

app.get('/admin/add-user', async (req, res) => {
    if (!req.session.logged_in || req.session.user_id !== 1) {
        req.flash('failure', 'You need to log in to perform this action.')
        res.redirect('/')
    } else {
        res.render('add-user', { csrfToken: req.csrfToken() })
    }
})

app.get('/my-files', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You need to log in to perform this action.')
        return res.redirect('/')
    } else {
        db.all('SELECT rowid,userId,fileName,uploadId,mimeType,password FROM uploads WHERE userId=?', req.session.user_id, (err, rows) => {
            return res.render('my-files', { files: rows })
        })
    }
})

app.get('/delete/:id', async (req, res) => {
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

app.post('/delete/:id', async (req, res) => {
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
                        req.flash('failure', 'Failed to delete file')
                        return res.redirect('/my-files')
                    } else {
                        fs.unlinkSync(path.join('uploads', row.fileName))
                        if (row.mimeType.includes('image')) {
                            fs.unlinkSync(path.join('uploads', 'thumbnail-' + row.fileName))
                        }
                        req.flash('success', 'File deleted')
                        return res.redirect('/my-files')
                    }
                })
            }
        })
    }
})

app.post('/admin/add-user', async (req, res) => {
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

app.post('/login', async (req, res) => {
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

app.post('/logout', async (req, res) => {
    if (req.session.logged_in) {
        req.session.logged_in = false
        req.session.user = null
        req.flash('success', 'Logged out.')
        res.redirect('/')
    }
})

app.post('/upload', async (req, res) => {
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
            let upload = req.files.file;

            //Use the mv() method to place the upload in upload directory (i.e. "uploads")
            await upload.mv('./uploads/' + upload.name);

            if (upload.mimetype == 'image/png' || upload.mimetype == 'image/jpeg') {
                let thumbnail = await saveThumbnail(upload.name)
                thumbnail.write('./uploads/' + 'thumbnail-' + upload.name)
            }

            let uploadId = nanoid.nanoid();

            let stmt = db.prepare('INSERT INTO uploads VALUES (?, ?, ?, ?, ?, ?)');
            stmt.run(null, req.session.user_id, upload.name, uploadId, upload.mimetype, null);
            stmt.finalize();

            //send response
            res.send({
                status: true,
                data: {
                    uploadId: uploadId
                }
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/upload/setpassword', async (req, res) => {
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

app.get('/download/:id', async (req, res) => {
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

app.post('/download/:id', async (req, res) => {
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

app.get('/preview/:id', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('failure', 'You need to be logged in to view previews')
        return res.redirect('/')
    }
    db.get('SELECT uploadId, fileName FROM uploads WHERE uploadId=?', req.params.id, (err, row) => {
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

app.listen(port, () =>
    console.log(`App is listening on port ${port}.`)
);