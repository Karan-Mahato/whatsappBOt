require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { sendWelcomeTemplate } = require('./services/welcome');
const { selectLanguage } = require('./services/languageSelect');
const { serviceSelection } = require('./services/serviceSelect');

const app = express();

// Proxy everything EXCEPT /send-welcome to Whatomate
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8080', // Whatomate's port
  changeOrigin: true
}));

app.use(express.json());

// Your backend route
app.post('/send-welcome', async (req, res) => {

  const phone = req.body.phone
    || req.body.contact?.phone
    || req.body.from;

  console.log('Extracted phone:', phone);

  if (!phone) return res.status(400).json({ error: 'No phone number' });

  try {
    await sendWelcomeTemplate(phone);
    await serviceSelection(phone);
    res.json({ success: true });
  } catch (err) {
    console.log(res);
    console.error('Meta API error:', JSON.stringify(err?.response?.data, null, 2));
    res.status(500).json({ error: err?.response?.data });
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
    console.log(res);
    console.error('Meta API error:', JSON.stringify(err?.response?.data, null, 2));
    res.status(500).json({ error: err?.response?.data });
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

app.listen(process.env.PORT, () => {
  console.log(`Backend running on http://localhost:${process.env.PORT}`);
});