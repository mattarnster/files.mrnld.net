var request = require('supertest');
var app = require('./index.js')
const bcrypt = require('bcrypt')
const { getDb } = require('./db');
var chai = require('chai')
  , expect = chai.expect
  , should = chai.should();

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

var supertest = request(app)

describe('loading express', async function() {
    var server;
    beforeEach(function() {
        db = getDb()
        bcrypt.hash('password', 12, (err, hash) => {
            if (err) {
                console.log('Failed to hash password')
            } else {
                var stmt = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?)')
                stmt.run(null, 'test@example.com', hash, 1, (err, rows) => {
                    if (err) {
                        console.log('Failed to add user to database')
                    } else {
                    }
                })
            }
        })
    })
    afterEach(function() {
        db = getDb()
        var stmt = db.prepare('DELETE FROM users WHERE email=?')
        stmt.run('test@example.com', (err, rows) => {
            if (err) {
                console.log('Error removing test user')
            } else {
                console.log(rows)
            }
        })
    })

    it('redirects unauthenticated users to the login page', function testIndexUnauthenticated(done) {
        supertest
            .get('/')
            .expect(200)
            .then( (res) => {
                expect(res.text).to.contain('form-login')
                done()
            })
            .catch(err => console.log(err))
    })

    it('logs the user in', async function testLogin() {
        const csrf = await supertest
            .get('/')
            .end(function (err, res) {
                var dom = new JSDOM(res.text)
                var csrf = dom.window.document.getElementsByName('_csrf')[0].value

                supertest
                    .post('/login')
                    .type('form')
                    .set('cookie', res.headers['set-cookie'])
                    .send('email=test@example.com')
                    .send('password=password')
                    .send('_csrf=' + csrf)
                    .expect(200)
                    .then( (res) => {
                        expect(res.text).to.contain('Setup')
                        done()
                    })
                    .catch(err => console.log(err))
                })
    })
})