const axios = require('axios');

require('dotenv').config();

const META_API_VERSION = process.env.META_API_VERSION || 'v19.0';
const META_URL = `https://graph.facebook.com/${META_API_VERSION}/${process.env.META_PHONE_NUMBER_ID}/messages`;

const HEADERS = {
  Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};

async function sendWhatsAppMessage(payload) {
  const res = await axios.post(META_URL, {
    messaging_product: 'whatsapp',
    ...payload
  }, { headers: HEADERS });

  console.log('WhatsApp message sent:', res.data);
  return res.data;
}

async function sendText(to, text) {
  return sendWhatsAppMessage({
    to,
    type: 'text',
    text: { body: text }
  });
}

module.exports = { sendWhatsAppMessage, sendText };
