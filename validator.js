const JSONResponseBuilder = require("./json_response_builder");

function validateEmail(email)
{
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

const countries =
[
    'Germany'
]

class ValidatorMsg
{
    static REQUIRED = new ValidatorMsg(101, '{0} is required.', 'validation.required');
    static STRING_NOT_IN_RANGE = new ValidatorMsg(102, 'length of field {0} is not in range [{1},{2}].', 'validation.string.not_in_range');
    static DATE_INVALID = new ValidatorMsg(103, '{0} ("{1}") is not a valid date. Best to use format YYYY-MM-DD', 'validation.date.invalid');
    static DATE_AGE = new ValidatorMsg(104, '"{0}": You ({1}) must be at least {2} years old.', 'validation.date.age');
    static EMAIL_INVALID = new ValidatorMsg(105, '"{0}" ({1}) is not a valid email.', 'validation.email.invalid');
    static COUNTRY_INVALID = new ValidatorMsg(106, '"{0}" ({1}) is not a country.', 'validation.country.invalid');

    constructor(code, debugStr, translStr)
    {
        this.code = code;
        this.debugStr = debugStr;
        this.translStr = translStr;
    }
}

class Validator
{
    constructor()
    {
        this.toCheck = [];
        this.messages = [];
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
                    this.messages.push({
                        msg: ValidatorMsg.REQUIRED,
                        vars: [elem.name]
                    });
                }
                else
                {
                    body[elem.name] = "";
                }
                return;
            }
            switch (elem.type)
            {
                case 'String':
                    
                    if(bodyAttr.length < elem.min || bodyAttr.length > elem.max)
                    {
                        this.messages.push({
                            msg: ValidatorMsg.STRING_NOT_IN_RANGE,
                            vars: [elem.name, elem.min, elem.max]
                        });
                        return;
                    }
                    break;

                case 'Date':
                    
                    var date = new Date(bodyAttr);
                    if(date == 'Invalid Date' || isNaN(Date.parse(bodyAttr)))
                    {
                        this.messages.push({
                            msg: ValidatorMsg.DATE_INVALID,
                            vars: [bodyAttr, elem.name, elem.max]
                        });
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
                        this.messages.push({
                            msg: ValidatorMsg.DATE_AGE,
                            vars: [elem.name, age, elem.minAge]
                        });
                        return;
                    }
                    break;
                
                case 'Email':
                    
                    if(!validateEmail(bodyAttr))
                    {
                        this.messages.push({
                            msg: ValidatorMsg.EMAIL_INVALID,
                            vars: [bodyAttr, elem.name]
                        });
                        return;
                    }
                    break;

                case 'Country':
                
                    if(countries.findIndex(x => x === bodyAttr) === -1)
                    {
                        this.messages.push({
                            msg: ValidatorMsg.EMAIL_INVALID,
                            vars: [bodyAttr, elem.name]
                        });
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
        return this.messages.length > 0;
    }

    makeErrorJSON()
    {
        const builder = new JSONResponseBuilder(true);
        this.messages.forEach(elem =>
        {
            builder.addMsg(elem.msg.code, elem.msg.debugStr, elem.msg.translStr, ...elem.vars);
        });
        return builder.get();
    }
}

module.exports = Validator;