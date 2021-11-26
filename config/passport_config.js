const server = require('../server');
const fs = require('fs');

const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const PUB_KEY = fs.readFileSync(process.env.PUB_KEY_PATH, 'utf-8');

const passportJwtOptions =
{
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: PUB_KEY,
    algorithms: ['RS256']
};

const strategy = new JwtStrategy(passportJwtOptions, (payload, done) =>
{
    server.getDatabasePool().query(`SELECT password FROM customer WHERE email='${payload.sub}' LIMIT 1`).then(async (rows) =>
    {
        return done(null, rows.length > 0);
    })
    .catch(err => done(err, null));
});

function initializePassport(passport)
{
    passport.use(strategy);
}

module.exports.initializePassport = initializePassport;