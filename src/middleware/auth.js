"use strict";
// Validate "Authorization" header, but it will not interrupt the request.

// To interrupt the request which without the request,
// please use "access.js" middleware.

// Import isProduction
const {isProduction} = require("../config");

// Import isObjectPropExists
const {isObjectPropExists} = require("../utils/native");

const saraTokenAuth = require("../utils/sara_token");
const testTokenAuth = require("../utils/test_token");

// Import authMethods
const authMethods = {
    "SARA": saraTokenAuth.validate,
    "TEST": testTokenAuth.validate,
};

// Check if the function will return a Promise
const isAsync = (func) =>
    func.constructor.name === "AsyncFunction";

// Export (function)
module.exports = async (req, _, next) => {
    const authCode = req.header("Authorization");
    if (!authCode) {
        next();
        return;
    }

    const params = authCode.split(" ");
    if (params.length !== 2) {
        next();
        return;
    }
    const [method, secret] = params;

    req.auth = {
        id: null,
        metadata: null,
        method,
        secret,
    };
    if (!isObjectPropExists(authMethods, req.auth.method)) {
        next();
        return;
    }

    const authMethod = authMethods[method];
    const authResult = isAsync(authMethod) ?
        await authMethod(secret) :
        authMethod(secret);

    const {
        userId,
        payload,
        isAborted,
    } = authResult;
    if (isAborted) {
        if (!isProduction()) {
            console.warn(
                "Authentication failed due to: ",
                payload,
                "\n",
            );
        }
        next();
        return;
    }

    req.auth.id = userId;
    req.auth.metadata = payload;
    next();
};
