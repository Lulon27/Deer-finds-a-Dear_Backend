const mariadb = require('mariadb');
const bcrypt = require('bcrypt');
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
        else
        {
            console.log("An error occured but no error handles was set in doQuery()");
        }
    }
}

function getUsers(errorHandler)
{
    return doQuery('SELECT * FROM customer LIMIT 200', [], errorHandler);
}

function getUsersWithProfiles(errorHandler)
{
    return doQuery(
    `SELECT
    customer.email,
    customer.password,
    customer.phone_number,
    customer.first_name,
    customer.last_name,
    customer.registration_date,
    customer.date_of_birth,
    customer.deletion_id,
    customer.profile_id,
    customer.address_id,
    customer.permission,
    profile_customer.description,
    profile_customer.last_online,
    profile_customer.is_active,
    profile_customer.latitude,
    profile_customer.longtitude
    FROM customer
    LEFT JOIN profile_customer
    ON customer.profile_id = profile_customer.profile_id`, [], errorHandler);
}

function getUserByEmail(email, errorHandler)
{
    return doQuery('SELECT * FROM customer WHERE email = ? LIMIT 1',
    [email],
    errorHandler);
}

function getUserByProfileID(profile_id, errorHandler)
{
    return doQuery('SELECT * FROM customer WHERE profile_id = ? LIMIT 1',
    [profile_id],
    errorHandler);
}

async function getUserByProfileIDHome(profile_id, errorHandler)
{
    const rows = await doQuery(
        `SELECT customer.email, customer.phone_number, customer.first_name, customer.last_name,
        customer.registration_date, customer.date_of_birth,
        profile_customer.description
        FROM customer
        INNER JOIN profile_customer
        ON customer.profile_id = profile_customer.profile_id AND customer.profile_id = ?`,
    [profile_id],
    errorHandler);
    return rows;
}

async function getUserByProfileIDGuest(profile_id, errorHandler)
{
    const rows = await doQuery(
        `SELECT customer.first_name, customer.last_name,
        customer.date_of_birth,
        profile_customer.description, profile_customer.last_online
        FROM customer
        INNER JOIN profile_customer
        ON customer.profile_id = profile_customer.profile_id AND customer.profile_id = ?`,
    [profile_id],
    errorHandler);
    return rows;
}

async function isUserRegistered(email, errorHandler)
{
    const rows = await doQuery('SELECT email FROM customer WHERE email = ? LIMIT 1',
    [email],
    errorHandler);
    return rows !== undefined && rows.length !== undefined && rows.length > 0;
}

async function authenticateUser(email, password, errorHandler)
{
    const rows = await doQuery('SELECT password FROM customer WHERE email = ? LIMIT 1',
    [email],
    errorHandler);
    if(rows === undefined || rows.length === undefined || rows.length == 0)
    {
        return false;
    }
    try
    {
        return await bcrypt.compare(password, rows[0].password);
    }
    catch(err)
    {
        errorHandler.catch_callback(err);
    }
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

function generateSetClause(fields)
{
    let setClause = 'SET ';
    let values = [];
    for (let i = 0; i < fields.length; i++)
    {
        const field = fields[i];
        setClause += field.name + '=?';
        if(i < fields.length - 1)
        {
            setClause += ",";
        }
        values.push(field.value);
    }
    return {
        str: setClause,
        values: values
    }
}

async function updateUserPersonalData(email, fields, errorHandler)
{
    setClause = generateSetClause(fields);
    setClause.values.push(email);
    
    return await doQuery(
        'UPDATE customer ' +
        setClause.str +
        ' WHERE email = ?',
        setClause.values,
        errorHandler);
    
}

async function updateUserProfile(profile_id, fields, errorHandler)
{
    setClause = generateSetClause(fields);
    setClause.values.push(profile_id);
    
    return await doQuery(
        'UPDATE profile_customer ' +
        setClause.str +
        ' WHERE profile_id = ?',
        setClause.values,
        errorHandler);
}

async function newProfile(errorHandler)
{
    const result = await doQuery('INSERT INTO profile_customer VALUES()', errorHandler);
    return result.insertId;
}

module.exports.getPool = getPool;

module.exports.getUsers = getUsers;
module.exports.getUsersWithProfiles = getUsersWithProfiles;
module.exports.getUserByEmail = getUserByEmail;
module.exports.getUserByProfileID = getUserByProfileID;
module.exports.getUserByProfileIDHome = getUserByProfileIDHome;
module.exports.getUserByProfileIDGuest = getUserByProfileIDGuest;

module.exports.isUserRegistered = isUserRegistered;
module.exports.authenticateUser = authenticateUser;
module.exports.newUser = newUser;
module.exports.newProfile = newProfile;
module.exports.updateUserPersonalData = updateUserPersonalData;
module.exports.updateUserProfile = updateUserProfile;

module.exports.default_err_handler = default_err_handler;
module.exports.function_err_handler = function_err_handler;
module.exports.passport_err_handler = passport_err_handler;