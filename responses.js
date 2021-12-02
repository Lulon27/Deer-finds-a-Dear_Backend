const JSONResponseBuilder = require('./json_response_builder')

class Responses
{
    static OK = new Responses(false, 0, 200);
    static CREATED = new Responses(false, 0, 201);
    static INTERNAL_ERROR = new Responses(true, 1, 500, 'Internal server error', 'error.internal_server_error');
    static INVALID_CREDENTIALS = new Responses(true, 3, 401, 'Invalid credentials', 'validation.invalid_credentials');
    static EMAIL_ALREADY_REGISTERED = new Responses(true, 1, 409, '{0} is already registered.', 'validation.email_taken');
    static USER_NOT_FOUND = new Responses(true, 1, 404, 'User with profile_id {0} does not exist.', 'user.not_found');
    static USER_HAS_NO_PROFILE = new Responses(true, 1, 409, 'User with email {0} has no profile.', 'user.no_profile');

    constructor(error, internalCode, httpCode, debugStr, translStr)
    {
        this.error = error;
        this.internalCode = internalCode;
        this.httpCode = httpCode;
        this.debugStr = debugStr;
        this.translStr = translStr;
    }

    static sendResponseWithField(res, response, fieldName, fieldValue, ...vars)
    {
        const builder = new JSONResponseBuilder(response.error);
        if(hasResponseMsg(response))
        {
            builder.addMsg(response.internalCode, response.debugStr, response.translStr, ...vars);
        }
        if(fieldName !== undefined && fieldValue !== undefined)
        {
            builder.addField(fieldName, fieldValue);
        }
        res.status(response.httpCode).json(builder.get());
    }

    static sendResponse(res, response, ...vars)
    {
        this.sendResponseWithField(res, response, undefined, undefined, ...vars);
    }

    /**
     * @param {Response<any, Record<string, any>, number>} res
     * @param {number} httpCode
     * @param {Array} responses
     */
    static sendResponseMulti(res, error, httpCode, responses)
    {
        const builder = new JSONResponseBuilder(error);
        responses.forEach(elem =>
        {
            if(hasResponseMsg(elem.response))
            {
                builder.addMsg(elem.response.internalCode, elem.response.debugStr, elem.response.translStr, ...elem.vars);
            }
        });
        res.status(httpCode).json(builder.get());
    }
}

function hasResponseMsg(response)
{
    return response.internalCode !== undefined && response.debugStr !== undefined && response.translStr !== undefined;
}

module.exports = Responses;