const { sendWhatsAppMessage } = require('./whatsapp');

async function selectLanguage(phone) {
  return sendWhatsAppMessage({
    to: phone,
    type: 'template',
    template: {
      name: process.env.LANGUAGE_SELECTION_TEMPLATE_NAME || 'language_selection',
      language: { code: process.env.LANGUAGE_SELECTION_TEMPLATE_LANG || 'en' },
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: process.env.LANGUAGE_SELECTION_IMAGE_URL || 'https://lh3.googleusercontent.com/d/1754S9hvDp7GrkLvj-wilzrWCqLs0Lk9V'
              }
            }
          ]
        }
      ]
    }
  });
}

async function openOtherLanguageFlow(phone) {
  return sendWhatsAppMessage({
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'flow',
      header: {
        type: 'text',
        text: 'Select Language'
      },
      body: {
        text: 'Choose your preferred language from the available options.'
      },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_id: process.env.OTHER_LANGUAGE_FLOW_ID || process.env.LANGUAGE_SELECTION_FLOW_ID,
          flow_token: `other_lang_${phone}_${Date.now()}`,
          flow_cta: 'Select language',
          flow_action: 'navigate',
          flow_action_payload: {
            screen: process.env.OTHER_LANGUAGE_SCREEN || process.env.LANGUAGE_SELECTION_SCREEN || 'LANGUAGE_SELECTION'
          }
        }
      }
    }
  });
}

module.exports = { selectLanguage, openOtherLanguageFlow };
