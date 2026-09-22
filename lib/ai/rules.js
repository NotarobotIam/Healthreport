// The free, rules-based "quick summary". No AI and no network: it counts, compares and matches records to a
// small knowledge base, so it costs effectively nothing per insight and nothing leaves this server.
//
// It returns the same raw shape the AI does (snake_case), so it goes through the same sanitising step and
// looks the same to the member.
const { ENTRIES, GENERIC_QUESTIONS } = require('./knowledge/pain');
const R = require('./ranges');

const top = (counts, n) => [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, n);
const tally = (values) => {
  const m = new Map();
  for (const v of values) m.set(v, (m.get(v) || 0) + 1);
  return m;
};
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const round1 = (n) => Math.round(n * 10) / 10;
const listWords = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const plural = (n, one, many) => (n === 1 ? one : many);
const duration = (days) => (days < 2 ? 'a day or so' : days < 14 ? `about ${days} days` : days < 60 ? `about ${Math.round(days / 7)} weeks` : `about ${Math.round(days / 30)} months`);

/** Whether the pain is getting stronger, easing, or holding steady: compare the older half of entries with the newer half. */
function severityTrend(rows) {
  const ordered = [...rows].sort((a, b) => b.startedDaysAgo - a.startedDaysAgo); // oldest first
  if (ordered.length < 4) return 'steady';
  const half = Math.floor(ordered.length / 2);
  const diff = avg(ordered.slice(-half).map((r) => r.severityOutOf10)) - avg(ordered.slice(0, half).map((r) => r.severityOutOf10));
  return diff >= 1 ? 'stronger' : diff <= -1 ? 'easing' : 'steady';
}

// ----------------------------------------------------------------------------------------------- pain

function analyzePain(data, { maxPossibilities = 3 } = {}) {
  const rows = data.rows;
  const N = rows.length;
  const areas = top(tally(rows.map((r) => r.area)), 2);
  const types = top(tally(rows.flatMap((r) => r.feelsLike)), 3);
  const severities = rows.map((r) => r.severityOutOf10);
  const meanSeverity = round1(avg(severities));
  const trend = severityTrend(rows);
  const constant = rows.filter((r) => r.pattern === 'constant').length;
  const comesGoes = rows.filter((r) => r.pattern === 'comes-and-goes').length;
  const getWorse = rows.filter((r) => r.pattern === 'getting-worse').length;
  const triggers = top(tally(rows.flatMap((r) => r.triggersAndRelief || [])), 2).filter(([, n]) => n >= 2);
  const spreads = rows.find((r) => r.spreadsTo);
  const longest = Math.max(...rows.filter((r) => r.status === 'active').map((r) => r.startedDaysAgo), 0);

  const patterns = [];
  if (areas[0]) patterns.push(`Most of your pain is in ${areas[0][0]} (${areas[0][1]} of ${data.total} ${plural(data.total, 'entry', 'entries')})${areas[1] ? `, then ${areas[1][0]} (${areas[1][1]})` : ''}.`);
  if (types.length) patterns.push(`It is most often described as ${listWords(types.map(([t]) => t))}.`);
  patterns.push(`Strength averages ${meanSeverity} out of 10 (from ${Math.min(...severities)} to ${Math.max(...severities)}) and looks ${trend === 'stronger' ? 'to be getting stronger' : trend === 'easing' ? 'to be easing' : 'about the same'} over time.`);
  if (constant > N / 2) patterns.push('It is mostly there all the time.');
  else if (comesGoes > N / 2) patterns.push('It mostly comes and goes.');
  if (getWorse >= 2) patterns.push(`${getWorse} entries say it is getting worse.`);
  if (triggers.length) patterns.push(`${listWords(triggers.map(([t]) => `"${t}"`))} ${triggers.length === 1 ? 'comes' : 'come'} up most often as ${triggers.length === 1 ? 'a trigger or relief' : 'triggers or relief'}.`);
  if (longest >= 1) patterns.push(`The longest-running entry started ${duration(longest)} ago.`);
  if (spreads) patterns.push(`At least one entry mentions it spreading: "${spreads.spreadsTo}".`);

  // Match the records to the knowledge base.
  const ctx = { worsening: trend === 'stronger' || getWorse >= 2 };
  const typeSet = new Set(rows.flatMap((r) => r.feelsLike));
  const scored = [];
  for (const e of ENTRIES) {
    let matched = 0;
    if (e.area) matched = rows.filter((r) => e.area.test(`${r.area} ${r.bodySystem}`)).length;
    let score = (matched / N) * 3;
    if (e.types) {
      const overlap = e.types.filter((t) => typeSet.has(t)).length;
      if (!overlap) continue;
      score += overlap * 0.8;
    } else if (e.when) {
      if (!e.when(ctx)) continue;
      score = 1;
    } else if (!matched) continue;
    if (score >= 0.6) scored.push({ entry: e, score, matched });
  }
  scored.sort((a, b) => b.score - a.score);
  const chosen = scored.slice(0, Math.max(0, Math.min(3, maxPossibilities)));

  const possibilities = chosen.map(({ entry, matched }) => ({
    name: entry.name,
    why_it_might_fit: entry.area ? `${entry.why} ${matched} of your ${N} ${plural(N, 'entry is', 'entries are')} in this area.` : entry.why,
    urgency: entry.urgency,
  }));

  const tests = [...new Set(chosen.flatMap(({ entry }) => entry.tests || []))].slice(0, 5);
  const questions = [...new Set([...chosen.flatMap(({ entry }) => entry.questions || []), ...GENERIC_QUESTIONS])].slice(0, 7);
  const redFlags = [...new Set(chosen.flatMap(({ entry }) => entry.redFlags || []))];

  const insufficient = possibilities.length === 0;
  const summary = `You have logged ${data.total} ${plural(data.total, 'entry', 'entries')}. ${areas[0] ? `The pain is mostly in ${areas[0][0]}` : 'The pain is spread across different places'}${types.length ? `, usually ${types[0][0]}` : ''}, and about ${meanSeverity} out of 10 in strength.`;

  return { summary, patterns, possibilities, tests_to_ask_about: tests, questions_for_doctor: questions, red_flags: redFlags, insufficient_data: insufficient };
}

// ------------------------------------------------------------------------------------------ physiology

const num = (rows, key) => rows.filter((r) => typeof r[key] === 'number').map((r) => r[key]);
const urg = (tone) => (tone === 'alert' ? 'urgent' : tone === 'watch' ? 'soon' : 'routine');

function analyzePhysiology(data, { maxPossibilities = 3 } = {}) {
  const rows = data.readings; // newest first
  const patterns = [];
  const items = []; // things worth raising, most important first
  const tests = [];
  const questions = [];

  const trendWord = (xs) => {
    if (xs.length < 4) return null;
    const half = Math.floor(xs.length / 2);
    const recent = avg(xs.slice(0, half));
    const older = avg(xs.slice(-half));
    return { recent, older, diff: recent - older };
  };

  // Blood pressure
  const sys = rows.filter((r) => typeof r.systolic === 'number' && typeof r.diastolic === 'number');
  if (sys.length) {
    const last = sys.slice(0, 3);
    const s = Math.round(avg(last.map((r) => r.systolic)));
    const d = Math.round(avg(last.map((r) => r.diastolic)));
    const a = R.bp(s, d);
    patterns.push(`Your last ${last.length} blood pressure ${plural(last.length, 'reading', 'readings')} averaged ${s}/${d}, which is ${a.label}.`);
    const t = trendWord(sys.map((r) => r.systolic));
    if (t && Math.abs(t.diff) >= 6) patterns.push(`Your top blood-pressure number has been ${t.diff > 0 ? 'rising' : 'falling'} (about ${Math.round(Math.abs(t.diff))} points between older and newer readings).`);
    // An average can hide a single very high reading, so the newest one is checked on its own too.
    const newest = R.bp(sys[0].systolic, sys[0].diastolic);
    if (newest.tone === 'alert') {
      items.push({ tone: 'alert', name: 'A very high blood pressure reading', why: `Your latest reading was ${sys[0].systolic}/${sys[0].diastolic}. A reading this high, especially with chest pain, a severe headache or shortness of breath, needs prompt medical advice.` });
    }
    if (a.tone !== 'good') {
      items.push({ tone: a.tone, name: `Blood pressure that is ${a.label}`, why: `Your recent readings average ${s}/${d}. One set of home readings can vary a lot, so a clinician usually looks at several taken over time.` });
      tests.push('Whether to repeat blood pressure readings at different times of day, or to try a home monitor');
      questions.push('What blood pressure range should I aim for?');
    }
  }
  // Heart rate
  const hr = num(rows, 'heartRate');
  if (hr.length) {
    const m = Math.round(avg(hr.slice(0, 5)));
    const a = R.heartRate(m);
    patterns.push(`Your recent heart rate averages ${m} beats a minute, which is ${a.label}.`);
    if (R.heartRate(hr[0]).tone === 'alert') items.push({ tone: 'alert', name: 'A very unusual heart rate reading', why: `Your latest heart rate was ${hr[0]} bpm. With dizziness, fainting or chest discomfort this needs urgent medical care.` });
    if (a.tone !== 'good') items.push({ tone: a.tone, name: `Heart rate that is ${a.label}`, why: `Your recent readings average ${m} bpm. Fitness, caffeine, stress, illness and medicines can all move it.` });
  }
  // Oxygen, temperature, breathing
  const ox = num(rows, 'spo2');
  if (ox.length) {
    const low = ox.filter((v) => v < 95).length;
    patterns.push(`Your oxygen level has been between ${Math.min(...ox)}% and ${Math.max(...ox)}%${low ? `, with ${low} ${plural(low, 'reading', 'readings')} under 95%` : ''}.`);
    const a = R.spo2(ox[0]);
    if (a.tone !== 'good') items.push({ tone: a.tone, name: `An oxygen level that is ${a.label}`, why: `Your latest reading was ${ox[0]}%. Cold fingers, nail polish and a poor fit can lower a home reading, so it is worth checking.` });
  }
  const tempC = num(rows, 'temperatureC');
  if (tempC.length && R.temperature(tempC[0]).tone !== 'good') items.push({ tone: R.temperature(tempC[0]).tone, name: `A temperature that is ${R.temperature(tempC[0]).label}`, why: `Your latest temperature reading was ${round1(tempC[0])} °C.` });
  const rr = num(rows, 'respiratoryRate');
  if (rr.length && R.respiratoryRate(rr[0]).tone !== 'good') items.push({ tone: R.respiratoryRate(rr[0]).tone, name: `A breathing rate that is ${R.respiratoryRate(rr[0]).label}`, why: `Your latest breathing rate was ${rr[0]} a minute.` });

  // Weight
  const wt = num(rows, 'weightKg');
  if (wt.length >= 2) {
    const change = round1(wt[0] - wt[wt.length - 1]);
    patterns.push(`Your weight has ${change === 0 ? 'stayed the same' : `${change > 0 ? 'risen' : 'fallen'} by about ${Math.abs(change)} kg`} across your readings.`);
    if (Math.abs(change) >= 4) {
      items.push({ tone: 'watch', name: `A weight change of ${Math.abs(change)} kg`, why: 'A change of this size over your recorded period is worth mentioning, especially if it was not intended.' });
      questions.push('Is my weight change something to look into?');
    }
  }
  const ht = rows.find((r) => typeof r.heightCm === 'number');
  if (wt.length && ht) patterns.push(`Your BMI is about ${round1(R.bmi(wt[0], ht.heightCm))}.`);

  // Exams
  for (const e of data.exams) {
    const r = e.results || {};
    const when = e.daysAgo < 30 ? 'in the last month' : `about ${Math.round(e.daysAgo / 30)} months ago`;
    if (e.flaggedAbnormal) items.push({ tone: 'watch', name: `An exam result flagged for follow-up (${e.examType})`, why: `You marked this ${e.examType} result, from ${when}, as needing follow-up.` });
    if (typeof r.lvef === 'number' && r.lvef < 50) items.push({ tone: 'watch', name: 'An ejection fraction below the typical range', why: `A heart pumping measure (LVEF) of ${r.lvef}% is lower than the typical 55% or above; a clinician can explain what it means for you.` });
    if (typeof r.fev1FvcRatio === 'number' && r.fev1FvcRatio < 70) items.push({ tone: 'watch', name: 'A lung-function ratio below 70%', why: `An FEV1/FVC ratio of ${r.fev1FvcRatio}% is often used as a marker of airflow limitation; a clinician can say what it means for you.` });
  }
  if (data.exams.length) patterns.push(`You have ${data.exams.length} heart or physical exam ${plural(data.exams.length, 'result', 'results')} on file.`);

  // Cholesterol
  const lipids = data.input.latestCholesterolBloodTests || {};
  for (const [k, v] of Object.entries(lipids)) {
    const value = parseFloat(v.value);
    if (!Number.isFinite(value) || !R.lipid[k]) continue;
    const label = R.lipid[k](value);
    patterns.push(`Your latest ${k === 'ldl' ? 'LDL' : k === 'hdl' ? 'HDL' : k === 'totalCholesterol' ? 'total cholesterol' : 'triglycerides'} was ${value}, which is ${label}.`);
    if (['high', 'borderline high', 'low'].includes(label) && !(k === 'hdl' && label !== 'low')) items.push({ tone: 'watch', name: `${k === 'ldl' ? 'LDL cholesterol' : k === 'hdl' ? 'HDL cholesterol' : k === 'totalCholesterol' ? 'Total cholesterol' : 'Triglycerides'} that is ${label}`, why: `Your latest value was ${value}. A clinician looks at this alongside your other risk factors.` });
  }
  if (items.some((i) => /cholesterol|LDL|Triglyc/i.test(i.name))) tests.push('Whether your cholesterol should be rechecked, and how your overall heart risk is worked out');

  const order = { alert: 0, watch: 1, good: 2 };
  items.sort((a, b) => order[a.tone] - order[b.tone]);
  const possibilities = items.slice(0, Math.max(0, Math.min(3, maxPossibilities))).map((i) => ({ name: i.name, why_it_might_fit: i.why, urgency: urg(i.tone) }));

  return {
    summary: items.length
      ? `Some of your readings sit outside the typical ranges, and ${items.length === 1 ? 'one thing stands out' : 'a few things stand out'} to ask about.`
      : 'Your recent readings look within the typical ranges. Regular checks and a chat with your clinician are still worthwhile.',
    patterns: patterns.slice(0, 8),
    possibilities,
    tests_to_ask_about: [...new Set(tests)].slice(0, 5),
    questions_for_doctor: [...new Set([...questions, 'Are my readings where they should be for me?', 'How often should I measure at home?', 'What warning signs mean I should come back sooner?'])].slice(0, 7),
    red_flags: [],
    insufficient_data: data.readings.length < 3 && data.exams.length === 0,
  };
}

module.exports = { analyzePain, analyzePhysiology, severityTrend };
