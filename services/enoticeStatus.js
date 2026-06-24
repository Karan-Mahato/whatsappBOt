const axios = require('axios');

const ENOTICE_STATUS_API_URL = process.env.ENOTICE_STATUS_API_URL ||
  'https://rajmargyatra.nhai.gov.in/nhai/api/v2.0/enoticedata';

async function fetchEnoticeStatus(vrn) {
  const res = await axios.post(ENOTICE_STATUS_API_URL, {
    vehRegNumber: vrn
  }, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: Number(process.env.ENOTICE_STATUS_API_TIMEOUT_MS || 15000)
  });

  return res.data;
}

function formatEnoticeStatus(vrn, apiResponse) {
  const data = apiResponse?.data;
  const notices = Array.isArray(data?.enoticeData) ? data.enoticeData : [];
  const notice = notices[0];

  if (!data?.enoticeExists || !notice) {
    return [
      `No e-notice found for VRN ${vrn}.`,
      '',
      'For more details, use the Rajmarg Yatra app or web portal.'
    ].join('\n');
  }

  const message = [
    `E-notice status for ${vrn}`,
    `E-notice number: ${notice.enoticeNo || 'Not available'}`,
    `Vehicle class: ${notice.vehicleClass || 'Not available'}`,
    `Plaza: ${notice.plazaName || 'Not available'}`,
    `Crossing date: ${formatDateTime(notice.plazaCrossingDatTime)}`,
    `Issue date: ${formatDateTime(notice.enoticeIssueDate)}`,
    `Due date: ${formatDateTime(notice.enoticeDueDate)}`,
    `User fee: ${formatAmount(notice.userFee)}`,
    `Discounted user fee: ${formatAmount(notice.discountedUserFee)}`,
    '',
    notices.length > 1
      ? `Showing the first of ${notices.length} e-notices.`
      : 'Showing the latest e-notice.',
    'For more details, use the Rajmarg Yatra app or web portal.'
  ];

  if (data.enoticeUrl) {
    message.push(data.enoticeUrl);
  }

  return message.join('\n');
}

function formatDateTime(value) {
  if (!value) return 'Not available';

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    return value;
  }

  const [, year, month, day, hour, minute, second = '00'] = match;
  const date = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  ));

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(date);
}

function formatAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'Not available';
  }

  return `INR ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2
  }).format(amount)}`;
}

module.exports = {
  fetchEnoticeStatus,
  formatEnoticeStatus
};
