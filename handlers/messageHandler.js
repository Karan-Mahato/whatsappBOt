const { sendWelcomeTemplate, sendText } = require('../services/welcome');

// GET — Meta verifies webhook
function handleVerification(req, res) {
  const mode  = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATOMATE_VERIFY_TOKEN) {
    console.log('Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
}

// POST — incoming messages
async function handleIncoming(req, res) {
  // Always respond 200 immediately — Meta resends if you don't
  res.sendStatus(200);

  try {
    const entry   = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;
    const message = value?.messages?.[0];

    if (!message) return; // could be a status update, ignore

    const userPhone = message.from; // e.g. "919876543210"

    console.log('Incoming message:', JSON.stringify(message, null, 2));

    // User sends any text (Hi, Hello, etc.)
    if (message.type === 'text') {
      await sendWelcomeTemplate(userPhone);
      return;
    }

    // User taps a quick reply button
    if (message.type === 'button') {
      const payload = message.button.payload;

      if (payload === 'lang_en') {
        // TODO: save to Firestore, then send main menu
        await sendText(userPhone, '✅ Language set to English.\n\nMain menu coming soon...');
      }
      else if (payload === 'lang_hi') {
        // TODO: save to Firestore, then send main menu
        await sendText(userPhone, '✅ भाषा हिंदी में सेट की गई।\n\nमुख्य मेनू जल्द आएगा...');
      }
      else if (payload === 'lang_other') {
        await sendText(userPhone, '🌐 Other language flow coming soon...');
      }
    }

  } catch (err) {
    console.error('Error handling message:', err?.response?.data || err.message);
  }
}

module.exports = { handleVerification, handleIncoming };