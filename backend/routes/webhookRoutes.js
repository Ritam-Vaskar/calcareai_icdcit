const express = require('express');
const router = express.Router();
const { handleVapiWebhook } = require('../webhooks/vapiWebhook');
const { verifyWebhookSignature } = require('../middleware/auth');

// Vapi webhook endpoint
router.post('/vapi', express.json(), verifyWebhookSignature, handleVapiWebhook);

module.exports = router;
