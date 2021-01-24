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
const csurf = require('csurf')
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

app.engine('handlebars', exphbs())
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
    if (!req.session.logged_in) {
        res.render('login', { csrfToken: req.csrfToken() })
    } else {
        res.render('index', { csrfToken: req.csrfToken() })
    }
})

app.post('/login', async (req, res) => {
    if (req.session.logged_in) {
        res.redirect('/')
    } else {
        db.get('SELECT email, password FROM users WHERE email=?', req.body.email, (err, row) => {
            if (err) {
                res.flash('failure', 'Login error')
                res.redirect('/')
            } else if (row) {
                bcrypt.compare(req.body.password, row.password, function (err, result) {
                    if (result) {
                        req.session.logged_in = true
                        req.session.user = row.email
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
            upload.mv('./uploads/' + upload.name);

            let uploadId = nanoid.nanoid();

            let stmt = db.prepare('INSERT INTO uploads VALUES (?, ?, ?)');
            stmt.run(1, upload.name, uploadId);
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

app.get('/download/:id', async (req, res) => {
    db.get('SELECT uploadId, fileName FROM uploads WHERE uploadId=?', req.params.id, (err, row) => {
        if (err) {
            res.render('404')
        } else {
            if (!row) {
                res.render('404')
            } else {
                res.download(path.join('uploads', row.fileName), row.fileName)
            }
        }
    })
})

app.listen(port, () =>
    console.log(`App is listening on port ${port}.`)
);