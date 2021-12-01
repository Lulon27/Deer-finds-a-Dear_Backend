const jsonwebtoken = require('jsonwebtoken');
const fs = require('fs');

const PRIV_KEY = fs.readFileSync(process.env.PRIV_KEY_PATH, 'utf-8');

function makeJWT(sub)
{
    const expiresIn = '1h';
    const payload =
    {
        sub: sub
    };
    const jwtOptions =
    {
        expiresIn: expiresIn,
        algorithm: 'RS256'
    }
    const jwt =
    {
        token: 'JWT ' + jsonwebtoken.sign(payload, PRIV_KEY, jwtOptions),
        expiresIn: expiresIn
    };
    return jwt;
}

module.exports.makeJWT = makeJWT;