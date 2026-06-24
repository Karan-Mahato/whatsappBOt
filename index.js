require('dotenv').config();
const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { sendWelcomeTemplate } = require('./services/welcome');
const { selectLanguage } = require('./services/languageSelect');
const { serviceSelection } = require('./services/serviceSelect');
const { handleVerification, handleIncoming } = require('./handlers/messageHandler');

const app = express();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SERVICE_SELECTION_DELAY_MS = Number(process.env.SERVICE_SELECTION_DELAY_MS || 1500);

app.use(express.json());

app.get('/webhook', handleVerification);
app.post('/webhook', handleIncoming);

// Your backend route
app.post('/send-welcome', async (req, res) => {

  const phone = req.body.phone
    || req.body.contact?.phone
    || req.body.from;

  console.log('Extracted phone:', phone);

  if (!phone) return res.status(400).json({ error: 'No phone number' });

  try {
    const language = req.body.language || req.body.languageCode || 'en';
    const welcomeResponse = await sendWelcomeTemplate(phone, language);
    await delay(SERVICE_SELECTION_DELAY_MS);
    const serviceSelectionResponse = await serviceSelection(phone, language);

    res.json({
      success: true,
      welcome: welcomeResponse,
      serviceSelection: serviceSelectionResponse
    });
  } catch (err) {
    console.error('Meta API error:', JSON.stringify(err?.response?.data, null, 2));
    res.status(500).json({
      error: err?.response?.data || { message: err.message }
    });
  }
});

app.post('/lang-select', async (req, res) => {

  const phone = req.body.phone
    || req.body.contact?.phone
    || req.body.from;

  console.log('Extracted phone:', phone);

  if (!phone) return res.status(400).json({ error: 'No phone number' });

  try {
    await selectLanguage(phone);
    res.json({ success: true });
  } catch (err) {
    console.error('Meta API error:', JSON.stringify(err?.response?.data, null, 2));
    res.status(500).json({
      error: err?.response?.data || { message: err.message }
    });
  }
});

// app.post('/service-select', async (req, res) => {

//   const phone = req.body.phone
//     || req.body.contact?.phone
//     || req.body.from;

//   console.log('Extracted phone:', phone);

//   if (!phone) return res.status(400).json({ error: 'No phone number' });

//   try {
//     await serviceSelection(phone);
//     res.json({ success: true });
//   } catch (err) {
//     console.log(res);
//     console.error('Meta API error:', JSON.stringify(err?.response?.data, null, 2));
//     res.status(500).json({ error: err?.response?.data });
//   }
// });

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Proxy Whatomate dashboard/API requests after local backend routes.
app.use('/api', createProxyMiddleware({
  target: process.env.WHATOMATE_URL || 'http://localhost:8080',
  changeOrigin: true,
  on: {
    proxyReq: fixRequestBody
  }
}));

app.listen(process.env.PORT, () => {
  console.log(`Backend running on http://localhost:${process.env.PORT}`);
});
