const axios = require('axios');

require("dotenv").config();

const META_URL = `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`;

const HEADERS = {
  Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};

async function sendWelcomeTemplate(phone) {
  const res = await axios.post(META_URL, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'welcome_1033_en',
      language: { code: 'en' },
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: 'https://lh3.googleusercontent.com/d/1iBTkgERgbKswN_8RTPa-X9RhTeB5koo4'
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

module.exports = { sendWelcomeTemplate, sendText };