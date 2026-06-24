const { openOtherLanguageFlow, selectLanguage } = require('../services/languageSelect');
const {
  fetchFastagStatus,
  formatFastagStatus,
  isValidVrn,
  normalizeVrn
} = require('../services/fastagStatus');
const {
  fetchEnoticeStatus,
  formatEnoticeStatus
} = require('../services/enoticeStatus');
const { serviceSelection } = require('../services/serviceSelect');
const { sendText } = require('../services/whatsapp');
const { getSession, upsertSession } = require('../services/sessionStore');
const { sendWelcomeTemplate } = require('../services/welcome');

const GREETING_RE = /^(hi|hii|hello|hey|ya|start|namaste)$/i;
const SERVICE_SELECTION_DELAY_MS = Number(process.env.SERVICE_SELECTION_DELAY_MS || 1500);

function handleVerification(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATOMATE_VERIFY_TOKEN) {
    console.log('Webhook verified');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
}

async function handleIncoming(req, res) {
  res.sendStatus(200);

  try {
    const normalized = normalizeIncomingMessage(req.body);

    if (!normalized) return;

    const { userPhone, type, text, languageCode, serviceCode } = normalized;

    console.log('Incoming message:', JSON.stringify(normalized, null, 2));

    if (type === 'text' && GREETING_RE.test(text.trim())) {
      await upsertSession(userPhone, {
        currentFlow: 'LANGUAGE_SELECTION',
        currentStep: 'ASK_LANGUAGE'
      });
      await selectLanguage(userPhone);
      return;
    }

    if (type === 'language_selection' && languageCode) {
      if (languageCode === 'other') {
        await upsertSession(userPhone, {
          currentFlow: 'LANGUAGE_SELECTION',
          currentStep: 'ASK_OTHER_LANGUAGE'
        });
        await openOtherLanguageFlow(userPhone);
        return;
      }

      const session = await upsertSession(userPhone, {
        language: languageCode,
        currentFlow: null,
        currentStep: null
      });

      await sendWelcomeTemplate(userPhone, languageCode);
      await delay(SERVICE_SELECTION_DELAY_MS);
      await serviceSelection(userPhone, languageCode);

      console.log('Session updated:', session);
      return;
    }

    const session = await getSession(userPhone);

    if (!session?.language) {
      await upsertSession(userPhone, {
        currentFlow: 'LANGUAGE_SELECTION',
        currentStep: 'ASK_LANGUAGE'
      });
      await selectLanguage(userPhone);
      return;
    }

    if (serviceCode === 'FASTAG_STATUS') {
      await upsertSession(userPhone, {
        currentFlow: 'FASTAG_STATUS',
        currentStep: 'ASK_VRN',
        data: {}
      });
      await sendText(userPhone, 'Please enter your vehicle registration number.');
      return;
    }

    if (serviceCode === 'ENOTICE_STATUS') {
      await upsertSession(userPhone, {
        currentFlow: 'ENOTICE_STATUS',
        currentStep: 'ASK_VRN',
        data: {}
      });
      await sendText(userPhone, 'Please enter your vehicle registration number.');
      return;
    }

    if (session.currentFlow === 'FASTAG_STATUS' && session.currentStep === 'ASK_VRN' && type === 'text') {
      await handleFastagVrn(userPhone, text);
      return;
    }

    if (session.currentFlow === 'ENOTICE_STATUS' && session.currentStep === 'ASK_VRN' && type === 'text') {
      await handleEnoticeVrn(userPhone, text);
      return;
    }
  } catch (err) {
    console.error('Error handling message:', err?.response?.data || err.message);
  }
}

async function handleEnoticeVrn(userPhone, text) {
  const vrn = normalizeVrn(text);

  if (!isValidVrn(vrn)) {
    await sendText(userPhone, 'Please enter a valid vehicle registration number, for example DL10CN9806.');
    return;
  }

  await upsertSession(userPhone, {
    currentFlow: 'ENOTICE_STATUS',
    currentStep: 'FETCHING_STATUS',
    data: { vrn }
  });

  try {
    const response = await fetchEnoticeStatus(vrn);
    const message = formatEnoticeStatus(vrn, response);

    await sendText(userPhone, message);
    await upsertSession(userPhone, {
      currentFlow: null,
      currentStep: null,
      data: { vrn, lastEnoticeStatus: response?.status || null }
    });
  } catch (err) {
    console.error('E-notice status API error:', err?.response?.data || err.message);
    await upsertSession(userPhone, {
      currentFlow: 'ENOTICE_STATUS',
      currentStep: 'ASK_VRN'
    });
    await sendText(userPhone, 'Unable to fetch e-notice status right now. Please check the vehicle number and try again.');
  }
}

async function handleFastagVrn(userPhone, text) {
  const vrn = normalizeVrn(text);

  if (!isValidVrn(vrn)) {
    await sendText(userPhone, 'Please enter a valid vehicle registration number, for example HR50F7076.');
    return;
  }

  await upsertSession(userPhone, {
    currentFlow: 'FASTAG_STATUS',
    currentStep: 'FETCHING_STATUS',
    data: { vrn }
  });

  try {
    const response = await fetchFastagStatus(vrn);
    const message = formatFastagStatus(vrn, response);

    await sendText(userPhone, message);
    await upsertSession(userPhone, {
      currentFlow: null,
      currentStep: null,
      data: { vrn, lastFastagStatus: response?.status || null }
    });
  } catch (err) {
    console.error('FASTag status API error:', err?.response?.data || err.message);
    await upsertSession(userPhone, {
      currentFlow: 'FASTAG_STATUS',
      currentStep: 'ASK_VRN'
    });
    await sendText(userPhone, 'Unable to fetch FASTag status right now. Please check the vehicle number and try again.');
  }
}

function normalizeIncomingMessage(body) {
  const whatomateMessage = normalizeWhatomateWebhook(body);

  if (whatomateMessage) {
    return whatomateMessage;
  }

  const metaMessage = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (metaMessage) {
    return normalizeMetaMessage(metaMessage);
  }

  const phone = body?.phone || body?.from || body?.contact?.phone;
  const text = body?.text || body?.message || body?.body;

  if (!phone) return null;

  if (body?.language || body?.languageCode) {
    return {
      userPhone: phone,
      type: 'language_selection',
      languageCode: normalizeLanguageCode(body.language || body.languageCode)
    };
  }

  const serviceCode = normalizeServiceCode(body?.service || body?.serviceCode || text);

  if (serviceCode) {
    return {
      userPhone: phone,
      type: 'service_selection',
      serviceCode
    };
  }

  if (text) {
    return {
      userPhone: phone,
      type: 'text',
      text: String(text)
    };
  }

  return null;
}

function normalizeWhatomateWebhook(body) {
  if (body?.event !== 'message.incoming' || !body?.data) {
    return null;
  }

  const data = body.data;
  const phone = data.contact_phone;

  if (!phone) return null;

  const messageType = String(data.message_type || '').toLowerCase();
  const content = data.content || '';
  const parsedContent = parseMaybeJson(content);
  const languageCode = extractLanguageCode(data) || extractLanguageCode(parsedContent) || normalizeLanguageCode(content);
  const serviceCode = extractServiceCode(data) || extractServiceCode(parsedContent) || normalizeServiceCode(content);

  if (languageCode) {
    return {
      userPhone: phone,
      type: 'language_selection',
      languageCode
    };
  }

  if (serviceCode) {
    return {
      userPhone: phone,
      type: 'service_selection',
      serviceCode
    };
  }

  if (messageType === 'text' && content) {
    return {
      userPhone: phone,
      type: 'text',
      text: String(content)
    };
  }

  return null;
}

function normalizeMetaMessage(message) {
  if (message.type === 'text') {
    return {
      userPhone: message.from,
      type: 'text',
      text: message.text?.body || ''
    };
  }

  if (message.type === 'interactive') {
    const reply = message.interactive?.nfm_reply;
    const response = parseFlowResponse(reply?.response_json);
    const languageCode = extractLanguageCode(response);
    const serviceCode = extractServiceCode(response);

    if (languageCode) {
      return {
        userPhone: message.from,
        type: 'language_selection',
        languageCode
      };
    }

    if (serviceCode) {
      return {
        userPhone: message.from,
        type: 'service_selection',
        serviceCode
      };
    }
  }

  if (message.type === 'button') {
    const languageCode = normalizeLanguageCode(message.button?.payload);
    const serviceCode = normalizeServiceCode(message.button?.payload || message.button?.text);

    if (languageCode) {
      return {
        userPhone: message.from,
        type: 'language_selection',
        languageCode
      };
    }

    if (serviceCode) {
      return {
        userPhone: message.from,
        type: 'service_selection',
        serviceCode
      };
    }
  }

  return null;
}

function parseFlowResponse(responseJson) {
  if (!responseJson) return {};

  try {
    return JSON.parse(responseJson);
  } catch (err) {
    console.warn('Could not parse flow response JSON:', responseJson);
    return {};
  }
}

function parseMaybeJson(value) {
  if (!value || typeof value !== 'string') return {};

  const trimmed = value.trim();

  if (!trimmed.startsWith('{')) return {};

  try {
    return JSON.parse(trimmed);
  } catch (err) {
    return {};
  }
}

function extractLanguageCode(response) {
  return normalizeLanguageCode(
    response.language ||
    response.language_code ||
    response.selected_language ||
    response.selectedLanguage ||
    response.lang
  );
}

function extractServiceCode(response) {
  return normalizeServiceCode(
    response.service ||
    response.service_code ||
    response.selected_service ||
    response.selectedService ||
    response.action
  );
}

function normalizeLanguageCode(value) {
  const normalized = String(value || '').toLowerCase().trim();

  if (['en', 'english', 'lang_en'].includes(normalized)) return 'en';
  if (['hi', 'hindi', 'lang_hi'].includes(normalized) || normalized.includes('हिं')) return 'hi';
  if (['te', 'telugu'].includes(normalized) || normalized.includes('తెలుగు')) return 'te';
  if (['ta', 'tamil'].includes(normalized) || normalized.includes('தமிழ்')) return 'ta';
  if (['kn', 'kannada'].includes(normalized) || normalized.includes('ಕನ್ನಡ')) return 'kn';
  if (['other', 'others', 'lang_other'].includes(normalized)) return 'other';

  return normalized || null;
}

function normalizeServiceCode(value) {
  const normalized = String(value || '').toLowerCase().trim();

  if (!normalized) return null;

  if (
    normalized === 'fastag_status' ||
    normalized === 'check_fastag_status' ||
    normalized === 'fastag status' ||
    normalized === 'check fastag status' ||
    normalized.includes('fastag')
  ) {
    return 'FASTAG_STATUS';
  }

  if (
    normalized === 'enotice_status' ||
    normalized === 'e_notice_status' ||
    normalized === 'check_enotice_status' ||
    normalized === 'check_e_notice_status' ||
    normalized === 'enotice status' ||
    normalized === 'e-notice status' ||
    normalized === 'check enotice status' ||
    normalized === 'check e-notice status' ||
    normalized.includes('enotice') ||
    normalized.includes('e-notice')
  ) {
    return 'ENOTICE_STATUS';
  }

  return null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { handleVerification, handleIncoming };
