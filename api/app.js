const cacheControl = require("./config/cacheControl");

// app package loading
let app = require("./src/app-setup");

// Middleware to validate and sanitize the recipient parameter
const validateRecipient = (req, res, next) => {
  let recipient = req.query.recipient;

  if (recipient) {
    // Remove any leading/trailing whitespace
    recipient = recipient.trim();

    // Check if the recipient is not just "_" or "-"
    if (recipient === "_" || recipient === "-") {
      return res.status(400).send({ error: 'Invalid recipient' });
    }

    // Append @akunlama.com if not already present
    if (!recipient.includes('@')) {
      recipient += '@akunlama.com';
    }

    // Check if the recipient matches the expected format and domain
    const isValidRecipient = /^[a-zA-Z0-9._-]+@akunlama\.com$/.test(recipient);

    if (!isValidRecipient) {
      return res.status(400).send({ error: 'Invalid recipient' });
    }

    // Update the sanitized recipient in the request query
    req.query.recipient = recipient;
  } else {
    return res.status(400).send({ error: 'Recipient is required' });
  }

  next();
};

// Setup the routes with recipient validation middleware
app.get("/api/v1/mail/list", validateRecipient, require("./src/api/mailList"));
app.get("/api/v1/mail/getInfo", validateRecipient, require("./src/api/mailGetInfo"));
app.get("/api/v1/mail/getHtml", validateRecipient, require("./src/api/mailGetHtml"));

// Legacy fallback behaviour - Note this is to be deprecated (after updating UI)
app.get("/api/v1/mail/getKey", validateRecipient, require("./src/api/mailGetInfo"));

// Static regex 
const staticRegex = /static\/(js|css|img)\/(.+)\.([a-zA-Z0-9]+)\.(css|js|png|gif)/g;

// Static folder hosting with cache control
// See express static options: https://expressjs.com/en/4x/api.html#express.static
app.use(app.express.static("public", {
  etag: true,
  setHeaders: function (res, path, stat) {
    if (staticRegex.test(path)) {
      res.set('cache-control', cacheControl.immutable);
    } else {
      res.set('cache-control', cacheControl.static);
    }
  }
}));

// Custom 404 handling - use index.html
app.use(function(req, res) {
  res.set('cache-control', cacheControl.static);
  res.sendFile(__dirname + '/public/index.html');
});

// Setup the server
var server = app.listen(8000, function () {
  console.log("app running on port.", server.address().port);
});
