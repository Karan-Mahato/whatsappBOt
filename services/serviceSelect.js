const axios = require('axios');

require("dotenv").config();

const META_URL = `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`;

const HEADERS = {
  Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};

async function serviceSelection(phone) {
  const res = await axios.post(META_URL, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'service_selection',
      language: { code: 'en' },
    }
  }, { headers: HEADERS });

  console.log('Template sent:', res.data);
  return res.data;
}

module.exports = {serviceSelection};