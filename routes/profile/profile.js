const server = require('../../server');
const database = require('../../database');
const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt_util = require('../../jwt_util');
const JSONResponseBuilder = require('../../json_response_builder');
const Responses = require('../../responses');
const Validator = require('../../validator');

const router = express.Router()

router.get('/', passport.authenticate('jwt', {session: false}), async (req, res) =>
{
    try
    {
        res.status(200).send("Profile :D");
    }
    catch(e)
    {
        console.log(e);
        Responses.sendResponse(res, Responses.INTERNAL_ERROR);
    }
})

module.exports = router;