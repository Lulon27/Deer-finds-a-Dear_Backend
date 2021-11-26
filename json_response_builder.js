
class JSONResponseBuilder
{
    constructor(error = false)
    {
        this.body =
        {
            error: error,
            msgs: []
        };
    }

    addMsg(code, devMsg, msg, ...vars)
    {
        this.body.msgs.push(
        {
            code: code,
            msg_dev: devMsg,
            msg: msg,
            vars: vars
        });
        return this;
    }

    addField(name, value)
    {
        this.body[name] = value;
        return this;
    }

    set error(error)
    {
        this.body.error = error;
    }

    get()
    {
        return this.body;
    }
}

module.exports = JSONResponseBuilder;