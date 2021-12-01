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

function doQuery(query, errorHandler, then_callback)
{
    if(then_callback === undefined)
    {
        throw new Error("then_callback cannot be undefined");
    }
    if(errorHandler === undefined)
    {
        throw new Error("errorHandler cannot be undefined");
    }
    db_connect_pool.query(query).then((rows) =>
    {
        then_callback(rows);
    }).catch((err) =>
    {
        errorHandler.catch_callback(err);
    });
}

function getUsers(errorHandler, then_callback)
{
    doQuery('SELECT * FROM customer;', errorHandler, then_callback);
}

function getUserByEmail(email, errorHandler, then_callback)
{
    doQuery(
    `
    SELECT * FROM customer WHERE email = '${email}' LIMIT 1
    `,
    errorHandler, then_callback);
}

function newUser(email, pw, phone, firstName, lastName, dob, errorHandler, then_callback)
{
    doQuery(
    `
    INSERT INTO customer
    (email, password, phone_number, first_name, last_name, date_of_birth)
    VALUES(
        '${email}',
        '${pw}',
        '${phone}',
        '${firstName}',
        '${lastName}',
        '${dob}'
    )
    `,
    errorHandler, then_callback);
}

module.exports.getPool = getPool;
module.exports.getUsers = getUsers;
module.exports.getUserByEmail = getUserByEmail;
module.exports.newUser = newUser;
module.exports.default_err_handler = default_err_handler;
module.exports.function_err_handler = function_err_handler;
module.exports.passport_err_handler = passport_err_handler;