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

router.get('/', passport.authenticate('jwt', {session: false}), (req, res) =>
{
    try
    {
        database.getUsers(database.default_err_handler(res), (rows) => Responses.sendResponseWithField(res, Responses.OK, 'rows', rows));
    }
    catch(e)
    {
        console.log(e);
        Responses.sendResponse(res, Responses.INTERNAL_ERROR);
    }
})

router.post('/', (req, res) =>
{
    try
    {
        console.log(req.protocol)
        //TODO only https?

        validator = new Validator();
        
        validator.addString('first_name', 1, 64, true);
        validator.addString('last_name', 1, 64, true);
        validator.addDate('date_of_birth', 18, true);
        validator.addEmail('email', true);
        validator.addString('phone_number', 1, 16, false);
        validator.addString('password', 6, 64, true);

        validator.validate(req.body);
        console.log(validator.errorList);

        if(validator.hasErrors)
        {
            res.status(422).json(validator.makeErrorJSON());
            return;
        }

        database.getUserByEmail(req.body.email, database.default_err_handler(res), (rows) =>
        {
            if (rows !== undefined && rows.length > 0)
            {
                Responses.sendResponse(res, Responses.EMAIL_ALREADY_REGISTERED, req.body.email);
                return;
            }
            registerUser(req.body, res);
        });
    }
    catch(e)
    {
        console.log("Error", e);
        Responses.sendResponse(res, Responses.INTERNAL_ERROR);
    }
})

async function registerUser(body, res)
{
    const salt = await bcrypt.genSalt()
    const hashedPassword = await bcrypt.hash(body.password, salt)

    database.newUser(
        body.email,
        hashedPassword,
        body.phone_number,
        body.first_name,
        body.last_name,
        '1970-01-01',
        database.default_err_handler(res),
        (rows) => 
        {
            const jwt = jwt_util.makeJWT(body.email);
            Responses.sendResponseWithField(res, Responses.CREATED, 'jwt', jwt);
        }
    );
}

async function logInUser(body, res, user)
{
    try
    {
        if(await bcrypt.compare(body.password, user.password))
        {
            const jwt = jwt_util.makeJWT(body.email);
            Responses.sendResponseWithField(res, Responses.OK, 'jwt', jwt);
        }
        else
        {
            Responses.sendResponse(res, Responses.INVALID_CREDENTIALS);
        }
    }
    catch(e)
    {
        console.log(e);
        Responses.sendResponse(res, Responses.INTERNAL_ERROR);
    }
}

router.post('/login', (req, res) =>
{
    database.getUserByEmail(req.body.email, database.default_err_handler(res), (rows) =>
    {
        if (rows === undefined || rows.length == 0)
        {
            Responses.sendResponse(res, Responses.INVALID_CREDENTIALS);
            return;
        }
        logInUser(req.body, res, rows[0]);
    });
})
module.exports = router;