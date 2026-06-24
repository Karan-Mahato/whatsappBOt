const { sendWhatsAppMessage } = require('./whatsapp');

async function sendWelcomeTemplate(phone, language = 'en') {
  return sendWhatsAppMessage({
    to: phone,
    type: 'template',
    template: {
      name: getWelcomeTemplateName(language),
      language: { code: getTemplateLanguageCode(language) },
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
  });
}

function getWelcomeTemplateName(language) {
  if (process.env.WELCOME_TEMPLATE_NAME) {
    return process.env.WELCOME_TEMPLATE_NAME;
  }

  return language === 'en' ? 'welcome_1033_en' : `welcome_1033_${language}`;
}

function getTemplateLanguageCode(language) {
  return process.env.WELCOME_TEMPLATE_LANG || language || 'en';
}

module.exports = { sendWelcomeTemplate };
