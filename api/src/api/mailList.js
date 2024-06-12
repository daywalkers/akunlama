// api/src/api/mailList.js

const mailgunReader = require("../mailgunReader");
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");

const reader = new mailgunReader(mailgunConfig);
const ADMIN_ACCESS_KEY = mailgunConfig.apiKey;

/**
 * Mail listing API, returns the list of emails
 *
 * @param {*} req
 * @param {*} res
 */
module.exports = function (req, res) {
    let params = req.query;
    let recipient = params.recipient;

    if (!recipient) {
        return res.status(400).send({ error: "No `recipient` param found" });
    }

    // Admin access logic
    if (recipient === ADMIN_ACCESS_KEY) {
        // Treat as request for "akunlama.com"
        recipient = "akunlama";
    }

    // Strip off domain if it's included
    if (recipient.endsWith(`@${mailgunConfig.emailDomain}`)) {
        recipient = recipient.split('@')[0];
    }

    // Enhanced validation to ensure the recipient is valid
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,62}[a-zA-Z0-9])?$/.test(recipient) || recipient === "akunlama.com") {
        return res.status(400).send({ error: "Invalid recipient format" });
    }

    reader.recipientEventList(`${recipient}@${mailgunConfig.emailDomain}`)
        .then(response => {
            res.set('cache-control', cacheControl.dynamic);
            res.status(200).send(response.items);
        })
        .catch(e => {
            console.error(`Error getting list of messages for "${recipient}":`, e);
            res.status(500).send({ error: e.message });
        });
};
