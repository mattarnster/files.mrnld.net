// files.mrnld.net
// A small file sharing service written in node.js
// 
// Author: Matthew Arnold
// GitHub: @mattarnster
// Twitter: @mattarnster
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const _ = require('lodash');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const flash = require('connect-flash')
const exphbs = require('express-handlebars')
const csurf = require('csurf');

const { getDb } = require('./db')

// set up db
const db = getDb()

// require routes
const home = require('./routes/home')
const auth = require('./routes/auth')
const setup = require('./routes/setup')
const admin = require('./routes/admin')
const uploader = require('./routes/uploader')
const myFiles = require('./routes/my-files')
const download = require('./routes/download')
const preview = require('./routes/preview')
const deleteFile = require('./routes/delete-files')
const libraries = require('./routes/libraries')

// initialize express
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

// configure handlebars extensions
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

// set up view engine
app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')

// set up sessions
app.use(session({
    store: new SQLiteStore,
    db: 'sessions.db',
    secret: 'test',
    dir: 'db',
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    resave: false,
    saveUninitialized: true,
}))

// csrf protection
app.use(csurf())

// enable flash messages and make session, csrf token available in views
app.use(flash())
app.use((req, res, next) => {
    res.locals.req = req
    res.locals.csrfToken = req.csrfToken()
    res.locals.success = req.flash('success')
    res.locals.failure = req.flash('failure')
    next()
})

//start app 
const port = process.env.PORT || 3000;

// add routes
app.use('/', home)
app.use('/', auth)
app.use('/admin', admin)
app.use('/setup', setup)
app.use('/upload', uploader)
app.use('/my-files', myFiles)
app.use('/download', download)
app.use('/preview', preview)
app.use('/delete', deleteFile)
app.use('/libraries', libraries)

// listen for incoming connections
var server = app.listen(port, () =>
    console.log(`App is listening on port ${port}.`)
);

module.exports = server