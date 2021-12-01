//Node libs
const express = require('express');
const passport = require('passport');

//Own modules
const jwt_util = require('./jwt_util');
const passport_config = require('./config/passport_config');

//Routers
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users/users');
const profileRouter = require('./routes/profile/profile');

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
app.use('/profile', profileRouter);

app.listen(process.env.PORT);
