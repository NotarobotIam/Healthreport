// Builds what is sent to the AI provider. The principle is *minimum necessary*: structured facts only,
// no name, email, username or exact dates, and any free text screened for contact details. Notes and
// age/gender are added only when the member ticks "include more detail".
const mongoose = require('mongoose');
const PainEntry = require('../../models/PainEntry');
const Vital = require('../../models/Vital');
const TestReport = require('../../models/TestReport');
const User = require('../../models/User');
const { normalize, findProblems, detectCrisis } = require('../contentPolicy');

const DAY = 86400000;
const MAX_PAIN_ENTRIES = 40;
const MAX_VITALS = 40;
const MAX_EXAMS = 15;

const daysAgo = (date, now) => Math.max(0, Math.round((now - new Date(date).getTime()) / DAY));

/** Free text is included only if it has no phone number, email or link in it. Otherwise it is left out. */
function safeText(value, max) {
  if (typeof value !== 'string') return null;
  const s = normalize(value).slice(0, max);
  if (!s || findProblems(s).length) return null;
  return s;
}

function ageRange(dateOfBirth, now) {
  if (!dateOfBirth) return undefined;
  const years = Math.floor((now - new Date(dateOfBirth).getTime()) / (365.25 * DAY));
  if (!Number.isFinite(years) || years < 18 || years > 120) return undefined;
  const decade = Math.floor(years / 10) * 10;
  return `${decade}-${decade + 9}`;
}

async function memberContext(userId, includeDetail, now) {
  if (!includeDetail) return undefined;
  const u = await User.findById(userId).select('dateOfBirth gender').lean();
  const context = {};
  const age = ageRange(u && u.dateOfBirth, now);
  if (age) context.ageRange = age;
  if (u && u.gender) context.gender = u.gender;
  return Object.keys(context).length ? context : undefined;
}

// -------------------------------------------------------------------------------------------- pain

async function collectPain(userId, { includeDetail = false, now = Date.now() } = {}) {
  const [entries, total, context] = await Promise.all([
    PainEntry.find({ userId }).sort({ onset: -1 }).limit(MAX_PAIN_ENTRIES).lean(),
    PainEntry.countDocuments({ userId }),
    memberContext(userId, includeDetail, now),
  ]);

  const texts = [];
  const rows = entries.map((e) => {
    const row = {
      area: e.location.partName,
      side: e.location.side,
      bodySystem: e.location.system,
      feelsLike: e.painTypes,
      severityOutOf10: e.severity,
      startedDaysAgo: daysAgo(e.onset, now),
      pattern: e.pattern,
      status: e.status,
    };
    const triggers = (e.triggers || []).map((t) => safeText(t, 40)).filter(Boolean);
    if (triggers.length) row.triggersAndRelief = triggers;
    const spreads = safeText(e.radiatesTo, 120);
    if (spreads) {
      row.spreadsTo = spreads;
      texts.push(spreads);
    }
    if (includeDetail) {
      const notes = safeText(e.notes, 500);
      if (notes) {
        row.personsNotes = notes;
        texts.push(notes);
      }
    }
    return row;
  });

  return {
    total,
    // Words that suggest distress are never sent for analysis; the caller shows support resources instead.
    crisis: texts.some(detectCrisis),
    input: { records: 'pain log', totalEntriesLogged: total, entriesShown: rows.length, entries: rows, ...(context && { about: context }) },
    rows,
  };
}

// ---------------------------------------------------------------------------------------- physiology

const EXAM_TYPES = ['Cardiac', 'Physical Exam'];
const LIPIDS = ['totalCholesterol', 'ldl', 'hdl', 'triglycerides'];
const VITAL_KEYS = ['systolic', 'diastolic', 'heartRate', 'temperatureC', 'respiratoryRate', 'spo2', 'weightKg', 'heightCm', 'waistCm', 'bodyFatPct'];

/** Heart-related imaging (e.g. an echocardiogram filed under Imaging) counts as a heart exam too. */
const isHeartImaging = (r) => r.testType === 'Imaging' && /heart|cardiac/i.test(String((r.results && r.results.imaging && r.results.imaging.bodyRegion) || ''));

const examFilter = (userId) => ({ userId, testType: mongoose.trusted({ $in: [...EXAM_TYPES, 'Imaging'] }) });

async function physiologyCounts(userId) {
  const [vitals, reports] = await Promise.all([
    Vital.countDocuments({ userId }),
    TestReport.find(examFilter(userId)).select('testType results').lean(),
  ]);
  const exams = reports.filter((r) => EXAM_TYPES.includes(r.testType) || isHeartImaging({ ...r, results: r.results })).length;
  return { vitals, exams, total: vitals + exams };
}

async function collectPhysiology(userId, { includeDetail = false, now = Date.now() } = {}) {
  const [vitals, reports, blood, counts, context] = await Promise.all([
    Vital.find({ userId }).sort({ measuredAt: -1 }).limit(MAX_VITALS).lean(),
    TestReport.find(examFilter(userId)).sort({ testDate: -1 }).limit(60).lean(),
    TestReport.find({ userId, testType: 'Blood' }).sort({ testDate: -1 }).limit(20).lean(),
    physiologyCounts(userId),
    memberContext(userId, includeDetail, now),
  ]);

  const texts = [];
  const readings = vitals.map((v) => {
    const row = { daysAgo: daysAgo(v.measuredAt, now) };
    for (const k of VITAL_KEYS) if (typeof v[k] === 'number') row[k] = v[k];
    if (includeDetail) {
      const note = safeText(v.note, 120);
      if (note) {
        row.note = note;
        texts.push(note);
      }
    }
    return row;
  });

  const exams = reports
    .filter((r) => EXAM_TYPES.includes(r.testType) || isHeartImaging(r))
    .slice(0, MAX_EXAMS)
    .map((r) => {
      const results = r.results instanceof Map ? Object.fromEntries(r.results) : r.results || {};
      const values = {};
      for (const [key, val] of Object.entries(results)) {
        if (val !== null && typeof val === 'object') continue; // nested blobs (imaging metadata) are not sent
        const s = typeof val === 'number' ? val : safeText(String(val), 80);
        if (s !== null && s !== undefined && s !== '') values[key] = s;
      }
      const row = { examType: results.examKind || r.testType, daysAgo: daysAgo(r.testDate, now), results: values, flaggedAbnormal: r.normal === false };
      if (includeDetail) {
        const notes = safeText(r.notes, 300);
        if (notes) {
          row.clinicianNotes = notes;
          texts.push(notes);
        }
      }
      return row;
    });

  // The most recent value of each cholesterol marker, if the person has had a blood test.
  const lipids = {};
  for (const r of blood) {
    const results = r.results instanceof Map ? Object.fromEntries(r.results) : r.results || {};
    for (const k of LIPIDS) if (lipids[k] === undefined && results[k] !== undefined) lipids[k] = { value: String(results[k]).slice(0, 30), daysAgo: daysAgo(r.testDate, now) };
  }

  return {
    total: counts.total,
    crisis: texts.some(detectCrisis),
    input: {
      records: 'physiology',
      readingsShown: readings.length,
      readings,
      exams,
      ...(Object.keys(lipids).length && { latestCholesterolBloodTests: lipids }),
      ...(context && { about: context }),
    },
    readings,
    exams,
  };
}

// ------------------------------------------------------------------------------ fixed safety text

const CHEST = /heart|sternum|rib\b|ribs|thora|lung|pector|bronch|pleura|esophag|aort|cardiac|ventric|atri/i;
const HEAD = /brain|cerebr|cranium|skull|meninge|cerebell|head\b/i;
const BELLY = /stomach|appendix|liver|gall|pancrea|intestin|colon|abdom|kidney|spleen/i;

/**
 * Warning signs added by the *server*, from the records themselves, whatever the model says. They are
 * the standard "don't wait for an appointment" list for the areas involved, not a triage of the person.
 */
function redFlagsFor(kind, data) {
  const flags = [];
  if (kind === 'pain') {
    const where = data.rows.map((r) => `${r.area} ${r.bodySystem}`).join(' | ');
    if (CHEST.test(where)) flags.push('Chest pain with shortness of breath, sweating, nausea, or pain spreading to the arm or jaw can be a medical emergency. Call your local emergency number.');
    if (HEAD.test(where)) flags.push('A sudden, severe headache, or head pain with confusion, weakness, trouble speaking, or changes in vision needs emergency care.');
    if (BELLY.test(where)) flags.push('Severe or worsening belly pain, especially with fever, vomiting, or blood in your stool, needs prompt medical attention.');
    if (data.rows.some((r) => r.severityOutOf10 >= 8)) flags.push('Very severe pain, or pain that came on suddenly and keeps getting worse, should be checked promptly rather than waiting.');
  } else {
    const latest = data.readings[0] || {};
    if (latest.systolic >= 180 || latest.diastolic >= 120) flags.push('A blood pressure of 180/120 or higher, especially with chest pain, severe headache, or shortness of breath, needs urgent medical care.');
    if (latest.spo2 !== undefined && latest.spo2 < 92) flags.push('An oxygen level below 92% with shortness of breath needs urgent medical advice.');
    if (latest.heartRate !== undefined && (latest.heartRate < 40 || latest.heartRate > 150)) flags.push('A very slow or very fast heart rate with dizziness, fainting, or chest discomfort needs urgent medical care.');
    if (latest.temperatureC !== undefined && latest.temperatureC >= 39.4) flags.push('A high fever that will not come down, or with confusion or a stiff neck, needs urgent medical care.');
  }
  return flags;
}

/**
 * Warning signs for a typed question, chosen by *us* from the words in it. The model may add its own, but
 * these are always present, so an omission by the model can never remove them.
 */
function redFlagsForQuestion(text) {
  const t = String(text || '');
  const flags = [];
  if (/breast|nipple|areola/i.test(t)) flags.push('A new lump or thickening, dimpling or redness of the skin, nipple discharge or a nipple that turns inward, swelling, or pain in one spot that does not go away should be checked promptly.');
  if (/chest|heart|rib\b|ribs|sternum/i.test(t)) flags.push('Chest pain with shortness of breath, sweating, nausea, or pain spreading to the arm or jaw can be a medical emergency. Call your local emergency number.');
  if (/head|migraine|skull/i.test(t)) flags.push('A sudden, severe headache, or head pain with confusion, weakness, trouble speaking, or changes in vision needs emergency care.');
  if (/stomach|belly|abdom|bowel|stool/i.test(t)) flags.push('Severe or worsening belly pain, especially with fever, vomiting, or blood in your stool, needs prompt medical attention.');
  if (/\blump|bleed|discharge|mole\b|growing|swelling/i.test(t)) flags.push('A new lump, bleeding, discharge, or a change in size, shape or colour should be looked at promptly rather than watched.');
  return flags;
}

const DISCLAIMER =
  'This is not a diagnosis and it is not medical advice. It was generated by an AI system from what you have recorded, it can be wrong, and it cannot examine you. Please discuss it with your doctor before acting on anything here.';

module.exports = { collectPain, collectPhysiology, physiologyCounts, redFlagsFor, redFlagsForQuestion, DISCLAIMER, safeText, ageRange, EXAM_TYPES };
