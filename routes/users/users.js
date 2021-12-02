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

router.get('/', async (req, res) =>
{
    try
    {
        rows = await database.getUsersWithProfiles(database.default_err_handler(res));
        Responses.sendResponseWithField(res, Responses.OK, 'rows', rows);
    }
    catch(e)
    {
        console.log(e);
        Responses.sendResponse(res, Responses.INTERNAL_ERROR);
    }
})

router.post('/', async (req, res) =>
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

        const isRegistered = await database.isUserRegistered(req.body.email, database.default_err_handler(res))
        if (isRegistered)
        {
            Responses.sendResponse(res, Responses.EMAIL_ALREADY_REGISTERED, req.body.email);
            return;
        }
        registerUser(req.body, res);
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

    const profile_id = await database.newProfile(database.default_err_handler(res));

    database.newUser(
        body.email,
        hashedPassword,
        body.phone_number,
        body.first_name,
        body.last_name,
        new Date(body.date_of_birth).toISOString().split('T')[0],
        profile_id,
        database.default_err_handler(res));
    
    const jwt = jwt_util.makeJWT(body.email);
    Responses.sendResponseWithField(res, Responses.CREATED, 'user',
    {
        profile_id: profile_id,
        jwt: jwt
    });
}

async function logInUser(body, res, user)
{
    try
    {
        if(await bcrypt.compare(body.password, user.password))
        {
            const jwt = jwt_util.makeJWT(body.email);
            Responses.sendResponseWithField(res, Responses.OK, 'user',
            {
                profile_id: user.profile_id,
                jwt: jwt
            });
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

router.post('/login', async (req, res) =>
{
    validator = new Validator();
    
    validator.addString('email', 0, 64, true);
    validator.addString('password', 0, 64, true);

    validator.validate(req.body);

    if(validator.hasErrors)
    {
        res.status(422).json(validator.makeErrorJSON());
        return;
    }

    const rows = await database.getUserByEmail(req.body.email, database.default_err_handler(res));
    if (rows === undefined || rows.length == 0)
    {
        Responses.sendResponse(res, Responses.INVALID_CREDENTIALS);
        return;
    }
    logInUser(req.body, res, rows[0]);
})

router.get('/:profile_id', passport.authenticate('jwt', {session: false}), async (req, res) =>
{
    const requestID = req.user.profile_id;
    const targetID = req.params.profile_id;

    let visitedUser;
    
    if(requestID == targetID) 
    {
        visitedUser = await database.getUserByProfileIDHome(targetID, database.default_err_handler(res));
    }
    else
    {
        visitedUser = await database.getUserByProfileIDGuest(targetID, database.default_err_handler(res));
    }
    if(visitedUser === undefined || visitedUser.length == 0)
    {
        Responses.sendResponse(res, Responses.USER_NOT_FOUND, targetID);
        return;
    }
    
    Responses.sendResponseWithField(res, Responses.OK, "user", visitedUser);
});

module.exports = router;