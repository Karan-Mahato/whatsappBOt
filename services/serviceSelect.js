const { sendWhatsAppMessage } = require('./whatsapp');

async function serviceSelection(phone, language = 'en') {
  return sendWhatsAppMessage({
    to: phone,
    type: 'template',
    template: {
      name: process.env.SERVICE_SELECTION_TEMPLATE_NAME || 'service_selection',
      language: { code: process.env.SERVICE_SELECTION_TEMPLATE_LANG || language || 'en' }
    }
  });
}

module.exports = { serviceSelection };
