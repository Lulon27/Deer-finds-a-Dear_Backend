const server = require('../../server');
const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt_util = require('../../jwt_util');
const JSONResponseBuilder = require('../../json_response_builder');

const router = express.Router()

const countries =
[
    'Germany'
]

function validateEmail(email)
{
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

class RegProcessor
{
    constructor()
    {
        this.responseBuilder = new JSONResponseBuilder();
        this.toCheck = [];
    }

    addString(toCheck, min, max, mandatory)
    {
        this.toCheck.push(
        {
            name: toCheck,
            type: 'String',
            min: min,
            max: max,
            mandatory: mandatory
        });
    }

    addDate(toCheck, minAge, mandatory)
    {
        this.toCheck.push(
        {
            name: toCheck,
            type: 'Date',
            minAge: minAge,
            mandatory: mandatory
        });
    }

    addEmail(toCheck, mandatory)
    {
        this.toCheck.push(
        {
            name: toCheck,
            type: 'Email',
            mandatory: mandatory
        });
    }

    addCountry(toCheck, mandatory)
    {
        this.toCheck.push(
        {
            name: toCheck,
            type: 'Country',
            mandatory: mandatory
        });
    }

    validate(body)
    {
        var bodyAttr;
        this.toCheck.forEach(elem =>
        {
            bodyAttr = body[elem.name];
            if(bodyAttr === undefined || bodyAttr.trim() === "")
            {
                if(elem.mandatory)
                {
                    console.log(elem)
                    this.responseBuilder.addMsg(101, `${elem.name} is required.`, `validation.${elem.name}.req`, elem.name);
                    this.responseBuilder.error = true;
                }
                return;
            }
            switch (elem.type)
            {
                case 'String':
                    
                    if(bodyAttr.length < elem.min || bodyAttr.length > elem.max)
                    {
                        this.responseBuilder.addMsg(
                            101,
                            `"${elem.name}" length is not in range [${elem.min},${elem.max}].`,
                            `validation.${elem.name}.invalid`,
                            elem.min,
                            elem.max);
                        this.responseBuilder.error = true;
                        return;
                    }
                    break;

                case 'Date':
                    
                    var date = new Date(bodyAttr);
                    if(date == 'Invalid Date' || isNaN(Date.parse(bodyAttr)))
                    {
                        this.responseBuilder.addMsg(101, `"${bodyAttr}" (${elem.name}) is not a valid date.`, `validation.${elem.name}.invalid`, bodyAttr, elem.name);
                        this.responseBuilder.error = true;
                        return;
                    }
                    var today = new Date();
                    var age = today.getFullYear() - date.getFullYear();
                    var m = today.getMonth() - date.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < date.getDate()))
                    {
                        age--;
                    }
                    if(age < elem.minAge)
                    {
                        this.responseBuilder.addMsg(101, `You (${age}) must be at least ${elem.minAge} years old.`, `validation.${elem.name}.invalid`, age, elem.minAge);
                        this.responseBuilder.error = true;
                        return;
                    }
                    break;
                
                case 'Email':
                    
                    if(!validateEmail(bodyAttr))
                    {
                        this.responseBuilder.addMsg(101, `"${bodyAttr}" (${elem.name}) is not a valid email.`, `validation.${elem.name}.invalid`, bodyAttr, elem.name);
                        this.responseBuilder.error = true;
                        return;
                    }
                    break;

                case 'Country':
                
                    if(countries.findIndex(x => x === bodyAttr) === -1)
                    {
                        this.responseBuilder.addMsg(101, `"${bodyAttr}" (${elem.name}) is not a country.`, `validation.${elem.name}.invalid`, bodyAttr, elem.name);
                        this.responseBuilder.error = true;
                        return;
                    }
                    break;

                default:
                    break;
            }
        });
    }

    get hasErrors()
    {
        return this.responseBuilder.error;
    }

    makeErrorJSON()
    {
        return this.responseBuilder.get();
    }
}

router.get('/', passport.authenticate('jwt', {session: false}),(req, res) =>
{
    try
    {
        server.getDatabasePool().query('SELECT * FROM customer').then((rows) =>
        {
            res.status(200).send(rows);
        })
    }
    catch(e)
    {
        console.log(e);
        res.status(500).json(new JSONResponseBuilder(true).addMsg(0, 'Error', 'error.internal_server_error').get());
    }
})

router.post('/', (req, res) =>
{
    try
    {
        console.log(req.protocol)
        //TODO only https?

        validator = new RegProcessor();
        
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

        server.getDatabasePool().query(
            `
            SELECT email FROM customer WHERE email = '${req.body.email}' LIMIT 1
            `
        ).then(async(rows) =>
        {
            if (rows !== undefined && rows.length > 0)
            {
                res.status(409).json(new JSONResponseBuilder(true).addMsg(1, `${req.body.email} is already registered.`, 'validation.email.taken', req.body.email).get());
                return;
            }

            const salt = await bcrypt.genSalt()
            const hashedPassword = await bcrypt.hash(req.body.password, salt)

            server.getDatabasePool().query(
                `
                INSERT INTO customer
                (email, password, phone_number, first_name, last_name, registration_date, date_of_birth)
                VALUES(
                    '${req.body.email}',
                    '${hashedPassword}',
                    '${req.body.phone_number}',
                    '${req.body.first_name}',
                    '${req.body.last_name}',
                    '2021-11-07', '1970-01-01'
                )
                `
            ).then((rows) =>
            {
                const jwt = jwt_util.makeJWT(req.body.email);
                res.status(201).json(new JSONResponseBuilder().addField('jwt', jwt).get());

            }).catch((err) =>
            {
                console.log('Database query error')
                console.log(err);
                res.status(500).json(new JSONResponseBuilder(true).addMsg(0, 'Database query error', 'error.internal_server_error').get());
            })
        })
    }
    catch(e)
    {
        console.log("Error", e.stack);
        console.log("Error", e.name);
        console.log("Error", e.message);
        res.status(500).json(new JSONResponseBuilder(true).addMsg(0, 'Error', 'error.internal_server_error').get());
    }
})

router.post('/login', (req, res) =>
{
    server.getDatabasePool().query(`SELECT password FROM customer WHERE email='${req.body.email}' LIMIT 1`).then(async (rows) =>
    {
        if(!rows[0])
        {
            res.status(401).json(new JSONResponseBuilder(true).addMsg(3, 'Invalid credentials', 'invalid_credentials').get());
            return;
        }
        try
        {
            if(await bcrypt.compare(req.body.password, rows[0].password))
            {
                console.log(rows[0].password)
                const jwt = jwt_util.makeJWT(req.body.email);
                res.status(200).json(new JSONResponseBuilder().addField('jwt', jwt).get());
            }
            else
            {
                res.status(401).json(new JSONResponseBuilder(true).addMsg(3, 'Invalid credentials', 'invalid_credentials').get());
            }
        }
        catch(e)
        {
            console.log(e);
            res.status(500).json(new JSONResponseBuilder(true).addMsg(0, 'Error', 'error.internal_server_error').get());
        }
    }).catch((err) =>
    {
        console.log('Database query error')
        console.log(err)
        res.status(500).json(new JSONResponseBuilder(true).addMsg(0, 'Database error', 'error.internal_server_error').get());
    })
})
module.exports = router;