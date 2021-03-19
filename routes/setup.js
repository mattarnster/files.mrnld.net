const express = require('express')
var router = express.Router()

router.get('/', async (req, res) => {
    if (!req.session.setup) {
        res.render('/')
    } else {
        res.render('add-user', { csrfToken: req.csrfToken(), setup: true })
    }
})

module.exports = router
