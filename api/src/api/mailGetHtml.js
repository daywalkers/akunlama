// Loading mailgun reader and config
const mailgunReader = require("../mailgunReader");
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");
const reader = new mailgunReader(mailgunConfig);

/**
 * Validate the region and key parameters and ensure they contain only allowed characters
 *
 * @param {String} region
 * @param {String} key
 */
function validateParams(region, key) {
    console.log("Validating parameters: region=", region, ", key=", key);
    if (!region || !key) {
        throw new Error("Region or key is undefined or null");
    }
    // Remove leading/trailing whitespace
    region = region.trim();
    key = key.trim();
    // Validate that only allowed characters are present
    if (!/^[a-zA-Z0-9._-]+$/.test(region) || !/^[a-zA-Z0-9._-]+$/.test(key)) {
        throw new Error("Invalid region or key");
    }
    return { region, key };
}

/**
 * Get and return the static email HTML content from the mailgun API, given the mailKey
 *
 * @param {*} req
 * @param {*} res
 */
module.exports = function (req, res) {
    let region = req.query.region;
    let key = req.query.key;
    console.log("Received request with region:", region, "and key:", key);

    try {
        // Validate and sanitize the region and key parameters
        const validatedParams = validateParams(region, key);
        region = validatedParams.region;
        key = validatedParams.key;
    } catch (error) {
        console.error("Validation error:", error.message);
        return res.status(400).send({ error: error.message });
    }

    reader
        .getKey({ region, key })
        .then((response) => {
            let body = response["body-html"] || response["body-plain"];
            if (!body) {
                body = "The kittens found no messages :(";
            }

            // Modify the HTML to handle links correctly
            body = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Email Content</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                        a { color: #0066cc; }
                    </style>
                </head>
                <body>
                    ${body}
                    <script>
                    (function() {
                        document.body.addEventListener('click', function(e) {
                            var target = e.target;
                            while (target && target.tagName !== 'A') {
                                target = target.parentNode;
                            }
                            if (target && target.tagName === 'A') {
                                e.preventDefault();
                                if (target.href) {
                                    window.open(target.href, '_blank', 'noopener,noreferrer');
                                }
                            }
                        }, false);
                    })();
                    </script>
                </body>
                </html>
            `;

            res.set("cache-control", cacheControl.static);
            res.status(200).send(body);
        })
        .catch((e) => {
            console.error(`Error getting mail HTML for /${region}/${key}: `, e);
            res.status(500).send({ error: "Internal Server Error" });
        });
};
