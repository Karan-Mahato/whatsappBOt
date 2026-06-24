const axios = require('axios');

const FASTAG_STATUS_API_URL = process.env.FASTAG_STATUS_API_URL ||
  'https://rajmargyatra.nhai.gov.in/nhai/api/annualpass/v2.0/vehicleAnnualPassDetails';

const FASTAG_STATUS_VRN_FIELD = process.env.FASTAG_STATUS_VRN_FIELD || 'vrn';

const EXCCODE_STYLES = {
  '00': { label: 'ACTIVE' },
  '01': { label: 'HOTLISTED' },
  '02': { label: 'EXEMPTED' },
  '03': { label: 'LOW BALANCE' },
  '04': { label: 'HANDICAP' },
  '05': { label: 'BLACKLISTED' },
  '06': { label: 'CLOSED' },
  '07': { label: 'ANNUAL PASS' },
  '08': { label: 'E-NOTICE' }
};

const EXCCODE_PRIORITY = {
  '00': 8,
  '01': 6,
  '02': 4,
  '03': 7,
  '04': 5,
  '05': 2,
  '06': 0,
  '07': 3,
  '08': 1
};

function normalizeVrn(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isValidVrn(vrn) {
  return /^[A-Z0-9]{6,11}$/.test(vrn);
}

async function fetchFastagStatus(vrn) {
  const payload = { [FASTAG_STATUS_VRN_FIELD]: vrn };
  const res = await axios.post(FASTAG_STATUS_API_URL, payload, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: Number(process.env.FASTAG_STATUS_API_TIMEOUT_MS || 15000)
  });

  return res.data;
}

function formatFastagStatus(vrn, apiResponse) {
  const item = apiResponse?.data?.[0];

  if (!item) {
    return [
      `No FASTag record found for VRN ${vrn}.`,
      '',
      'For more details, use the Rajmarg Yatra app or web portal.'
    ].join('\n');
  }

  const tags = Array.isArray(item.tags) ? item.tags : [];
  const primaryTag = getHighestPriorityTag(tags);
  const annualPass = item.ANNUAL_PASS_DETAILS || {};
  const exccode = primaryTag?.EXCCODE || 'NA';
  const tagStatus = EXCCODE_STYLES[exccode]?.label || 'UNKNOWN';
  const vehicleClass = primaryTag?.VEHICLECLASS || getFirstValue(tags, 'VEHICLECLASS') || annualPass.vehicleClass || 'Not available';
  const passId = annualPass.passId || 'Not available';
  const issueDate = annualPass.issueDate || annualPass.passStartDate || primaryTag?.ISSUEDATE || 'Not available';
  const tripsLeft = annualPass.tripLeft || annualPass.tripsLeft || annualPass.remainingTrips || annualPass.tripLimit || 'Not available';

  return [
    `FASTag status for ${vrn}`,
    `Vehicle class: ${vehicleClass}`,
    `EXC code: ${exccode} (${tagStatus})`,
    `Annual pass ID: ${passId}`,
    `Issue date: ${issueDate}`,
    `Trips left: ${tripsLeft}`,
    '',
    'For more details, use the Rajmarg Yatra app or web portal.'
  ].join('\n');
}

function getHighestPriorityTag(tags) {
  return [...tags].sort((a, b) => {
    const aPriority = EXCCODE_PRIORITY[a?.EXCCODE] ?? 99;
    const bPriority = EXCCODE_PRIORITY[b?.EXCCODE] ?? 99;
    return aPriority - bPriority;
  })[0] || null;
}

function getFirstValue(items, key) {
  return items.find((item) => item?.[key])?.[key];
}

module.exports = {
  fetchFastagStatus,
  formatFastagStatus,
  isValidVrn,
  normalizeVrn
};
