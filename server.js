//Node libs
const express = require('express');
const passport = require('passport');
const mariadb = require('mariadb');

//Own modules
const jwt_util = require('./jwt_util');
const passport_config = require('./config/passport_config');

//Routers
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users/users');

const db_connect_pool = mariadb.createPool({
     host: process.env.DB_HOST, 
     user: process.env.DB_USER, 
     password: process.env.DB_PASS,
     connectionLimit: 4,
     database: 'deer_finds_a_dear'
});


const app = express();
passport_config.initializePassport(passport);

//Configure express
app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.static('./public'));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(passport.initialize());

//Add routers
app.use('/', indexRouter)
app.use('/users', usersRouter);

app.listen(process.env.PORT);



//------------ Functions -----------------

function getDatabasePool()
{
    return db_connect_pool;
}

module.exports.getDatabasePool = getDatabasePool;
