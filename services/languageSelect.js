const axios = require('axios');

require("dotenv").config();

const META_URL = `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`;

const HEADERS = {
  Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};

async function selectLanguage(phone) {
  const res = await axios.post(META_URL, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'language_selection',
      language: { code: 'en' },
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: 'https://lh3.googleusercontent.com/d/1754S9hvDp7GrkLvj-wilzrWCqLs0Lk9V'
              }
            }
          ]
        }
      ]
    }
  }, { headers: HEADERS });

  console.log('Template sent:', res.data);
  return res.data;
}


async function sendText(phone, text) {
  const res = await axios.post(META_URL, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: text }
  }, { headers: HEADERS });

  return res.data;
}

module.exports = { selectLanguage, sendText };