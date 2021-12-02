const server = require('../server');
const database = require('../database');
const fs = require('fs');

const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const PUB_KEY = fs.readFileSync(process.env.PUB_KEY_PATH, 'utf-8');

const passportJwtOptions =
{
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('JWT'),
    secretOrKey: PUB_KEY,
    algorithms: ['RS256']
};

const strategy = new JwtStrategy(passportJwtOptions, async (payload, done) =>
{
    const rows = await database.getUserByEmail(payload.sub, database.passport_err_handler(done));
    if(rows.length > 0)
    {
        return done(null, rows[0]);
    }
    return done(null, false, {message: 'What is this'});
});

function initializePassport(passport)
{
    passport.use(strategy);
}

module.exports.initializePassport = initializePassport;