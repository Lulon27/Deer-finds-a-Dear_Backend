const mariadb = require('mariadb');
const Responses = require('./responses');

const db_connect_pool = mariadb.createPool({
    host: process.env.DB_HOST, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASS,
    connectionLimit: 4,
    database: 'deer_finds_a_dear'
});

function getPool()
{
    return db_connect_pool;
}

class DefaultErrorHandler
{
    constructor(res)
    {
        this.res = res;
    }

    catch_callback(err)
    {
        console.log(err);
        Responses.sendResponse(this.res, Responses.INTERNAL_ERROR);
    }
}

class FunctionErrorHandler
{
    constructor(f)
    {
        this.f = f;
    }

    catch_callback(err)
    {
        console.log(err);
        this.f(err);
    }
}

class PassportErrorHandler
{
    constructor(done)
    {
        this.done = done;
    }

    catch_callback(err)
    {
        console.log(err);
        this.done("Internal Server Error", null);
    }
}

function default_err_handler(res)
{
    return new DefaultErrorHandler(res);
}

function function_err_handler(f)
{
    return new FunctionErrorHandler(f);
}

function passport_err_handler(done)
{
    return new PassportErrorHandler(done);
}

async function doQuery(query, values, errorHandler)
{
    try
    {
        const result = await db_connect_pool.query(query, values);
        return result;
    }
    catch(err)
    {
        if(errorHandler !== undefined)
        {
            errorHandler.catch_callback(err);
        }
    }
}

function getUsers(errorHandler)
{
    return doQuery('SELECT * FROM customer LIMIT 200', [], errorHandler);
}

function getUserByEmail(email, errorHandler)
{
    return doQuery('SELECT * FROM customer WHERE email = ? LIMIT 1',
    [email],
    errorHandler);
}

async function isUserRegistered(email, errorHandler)
{
    const rows = await doQuery('SELECT email FROM customer WHERE email = ? LIMIT 1',
    [email],
    errorHandler);
    return rows !== undefined && rows.length !== undefined && rows.length > 0;
}

function newUser(email, pw, phone, firstName, lastName, dob, profile_id, errorHandler)
{
    doQuery(
    `INSERT INTO customer
    (email, password, phone_number, first_name, last_name, date_of_birth, profile_id)
    VALUES(?, ?, ?, ?, ?, ?, ?)`,
    [email, pw, phone ,firstName, lastName, dob, profile_id],
    errorHandler);
}

async function newProfile(errorHandler)
{
    const result = await doQuery('INSERT INTO profile_customer VALUES()', errorHandler);
    return result.insertId;
}

module.exports.getPool = getPool;

module.exports.getUsers = getUsers;
module.exports.getUserByEmail = getUserByEmail;
module.exports.isUserRegistered = isUserRegistered;
module.exports.newUser = newUser;
module.exports.newProfile = newProfile;

module.exports.default_err_handler = default_err_handler;
module.exports.function_err_handler = function_err_handler;
module.exports.passport_err_handler = passport_err_handler;