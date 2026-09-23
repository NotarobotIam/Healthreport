#!/usr/bin/env node
/**
 * Development seed data. NEVER for production.
 *
 * Creates a demo login plus a handful of clearly fake community members (usernames start
 * with "demo_", emails end in @demo.invalid) whose shared pain entries and threads make
 * "people like me" matching and the discussion pages testable.
 *
 *   npm run seed:dev            add demo data (safe to re-run)
 *   npm run seed:dev -- --reset remove previous demo data first
 *
 * Only ever touches accounts it created itself; real members' data is never modified.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const TestReport = require('../models/TestReport');
const PainEntry = require('../models/PainEntry');
const Thread = require('../models/Thread');
const Reply = require('../models/Reply');
const Support = require('../models/Support');
const Block = require('../models/Block');
const Report = require('../models/Report');
const Membership = require('../models/Membership');
const Friendship = require('../models/Friendship');
const Vital = require('../models/Vital');
const AiInsight = require('../models/AiInsight');
const fixtures = require('./demoFixtures');

const DEMO_LOGIN = { email: 'demo@test.com', password: 'demo-password-2026', handle: 'demo_user' };
const isDemoEmail = (e) => e === DEMO_LOGIN.email || e.endsWith('@demo.invalid');

function refuseUnsafeTarget() {
  if (config.isProd) throw new Error('Refusing to seed: NODE_ENV=production.');
  if (!/127\.0\.0\.1|localhost/.test(config.mongoUri) && process.env.ALLOW_REMOTE_SEED !== '1') {
    throw new Error(`Refusing to seed a non-local database (${config.mongoUri.replace(/\/\/.*@/, '//***@')}). Set ALLOW_REMOTE_SEED=1 to override.`);
  }
}

async function resetDemo() {
  const users = await User.find({ $or: [{ email: DEMO_LOGIN.email }, { email: /@demo\.invalid$/ }] }).select('_id');
  const ids = users.map((u) => u._id);
  if (!ids.length) return;
  const threadIds = (await Thread.find({ authorId: { $in: ids } }).select('_id')).map((t) => t._id);
  await Promise.all([
    Reply.deleteMany({ $or: [{ authorId: { $in: ids } }, { threadId: { $in: threadIds } }] }),
    Thread.deleteMany({ authorId: { $in: ids } }),
    PainEntry.deleteMany({ userId: { $in: ids } }),
    TestReport.deleteMany({ userId: { $in: ids } }),
    Support.deleteMany({ userId: { $in: ids } }),
    Block.deleteMany({ $or: [{ userId: { $in: ids } }, { blockedId: { $in: ids } }] }),
    Report.deleteMany({ reporterId: { $in: ids } }),
    Membership.deleteMany({ userId: { $in: ids } }),
    Vital.deleteMany({ userId: { $in: ids } }),
    AiInsight.deleteMany({ userId: { $in: ids } }),
    Friendship.deleteMany({ $or: [{ requesterId: { $in: ids } }, { recipientId: { $in: ids } }] }),
  ]);
  await User.deleteMany({ _id: { $in: ids } });
  console.log(`Removed ${ids.length} demo accounts and their data`);
}

/** Real body parts, looked up by name so seeded pain lands on the actual 3D model. */
function loadParts() {
  const atlasPath = path.join(__dirname, '..', 'digital-twin', 'public', 'models', 'atlas.json');
  const atlas = JSON.parse(fs.readFileSync(atlasPath, 'utf8'));
  const byName = new Map(atlas.parts.map((p) => [p.name, p]));
  const get = (name) => {
    const p = byName.get(name);
    if (!p) throw new Error(`Atlas part not found: ${name}`);
    const [lo, hi] = p.bounds;
    return { partId: p.id, partName: p.name, system: p.system, center: [0, 1, 2].map((i) => (lo[i] + hi[i]) / 2), size: [0, 1, 2].map((i) => hi[i] - lo[i]) };
  };
  return {
    shoulder: get('Acromial part of right deltoid'),
    knee: get('Right patella'),
    back: get('Second lumbar vertebra'),
    thigh: get('Right rectus femoris'),
    chest: get('Sternocostal part of right pectoralis major'),
  };
}

const sideOf = (x) => (Math.abs(x) < 0.02 ? 'midline' : x > 0 ? 'left' : 'right');
const days = (n) => new Date(Date.now() - n * 86400000).toISOString();

async function main() {
  refuseUnsafeTarget();
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  if (process.argv.includes('--reset')) await resetDemo();

  const parts = loadParts();
  const jitter = (c, size, i) => c.map((v, k) => v + ((((i * 7 + k * 3) % 5) - 2) / 2) * Math.min(size[k], 0.03) * 0.5);
  const entry = (part, i, over) => {
    const point = jitter(part.center, part.size, i);
    return {
      location: { partId: part.partId, partName: part.partName, system: part.system, side: sideOf(point[0]), point },
      pattern: 'comes-and-goes', triggers: [], status: 'active', visibility: 'community', ...over,
    };
  };

  // --- demo login + sample test reports
  let demo = await User.findOne({ email: DEMO_LOGIN.email });
  if (!demo) {
    demo = await User.create({
      name: 'Demo User', ...DEMO_LOGIN, dateOfBirth: new Date('1990-01-15'), gender: 'Other',
      bio: 'Demo account (seed data).',
      consent: { termsVersion: config.termsVersion, acceptedAt: new Date(), ageConfirmed: true },
    });
    for (const r of fixtures.reports.values()) {
      const { _id, userId, createdAt, ...data } = r;
      await TestReport.create({ ...data, userId: demo._id });
    }
    console.log(`Created ${DEMO_LOGIN.email} with ${fixtures.reports.size} sample reports`);
  }

  // --- fake community members
  const members = [
    { handle: 'demo_gardener', bio: 'Demo member. Shoulder pain after a lot of overhead work.', pain: [[parts.shoulder, ['sharp', 'aching'], 6, 12, 'getting-worse']] },
    { handle: 'demo_swimmer', bio: 'Demo member. Swimmer with a stubborn shoulder.', pain: [[parts.shoulder, ['aching', 'stiffness'], 5, 40, 'comes-and-goes']] },
    { handle: 'demo_painter', bio: 'Demo member.', pain: [[parts.shoulder, ['sharp', 'burning'], 7, 5, 'constant']] },
    { handle: 'demo_runner', bio: 'Demo member. Runner, knee trouble.', pain: [[parts.knee, ['aching', 'throbbing'], 4, 60, 'comes-and-goes']] },
    { handle: 'demo_hiker', bio: 'Demo member.', pain: [[parts.knee, ['sharp'], 6, 20, 'getting-better']] },
    { handle: 'demo_desk_job', bio: 'Demo member. Desk worker, lower back.', pain: [[parts.back, ['dull', 'aching'], 5, 200, 'constant']] },
    { handle: 'demo_carpenter', bio: 'Demo member.', pain: [[parts.back, ['sharp', 'shooting'], 8, 9, 'getting-worse']] },
    { handle: 'demo_cyclist', bio: 'Demo member.', pain: [[parts.thigh, ['cramping'], 4, 15, 'comes-and-goes']] },
    { handle: 'demo_survivor', bio: 'Demo member. Bladder cancer survivor, three years post-treatment.', pain: [] },
    { handle: 'demo_ttc', bio: 'Demo member. Navigating fertility testing with my partner.', pain: [] },
  ];
  const created = {};
  for (const m of members) {
    let u = await User.findOne({ handle: m.handle });
    if (!u) {
      u = await User.create({
        name: 'Demo Member', email: `${m.handle}@demo.invalid`, handle: m.handle, bio: m.bio,
        password: `demo-${m.handle}-password`,
        consent: { termsVersion: config.termsVersion, acceptedAt: new Date(), ageConfirmed: true },
      });
      let i = 0;
      for (const [part, painTypes, severity, ago, pattern] of m.pain) {
        await PainEntry.create({ userId: u._id, ...entry(part, i++ + m.handle.length, { painTypes, severity, onset: days(ago), pattern }) });
      }
    }
    created[m.handle] = u;
  }

  // --- a few threads with replies, tagged to body regions
  if (!(await Thread.exists({ authorId: created.demo_gardener._id }))) {
    const region = (p) => ({ partId: p.partId, partName: p.partName, system: p.system, side: 'right' });
    const t1 = await Thread.create({
      authorId: created.demo_gardener._id, title: 'Sharp pain in my shoulder when I lift my arm',
      body: 'It started about two weeks ago after a weekend of trimming hedges. The pain is sharp when I lift my arm above my shoulder and it aches at night. Has anyone dealt with something similar? What helped?',
      region: region(parts.shoulder), painTypes: ['sharp', 'aching'], lastActivityAt: new Date(),
    });
    const replies = [
      [created.demo_swimmer, 'I had something similar last year. Resting it for a couple of weeks and doing gentle range-of-motion work with a physiotherapist helped me. Worth getting it looked at if it is not improving.'],
      [created.demo_painter, 'Mine is worse at night too. I found that changing my sleeping position made a small difference, but I am still waiting on an appointment.'],
    ];
    for (const [who, body] of replies) await Reply.create({ threadId: t1._id, authorId: who._id, body });
    await Thread.updateOne({ _id: t1._id }, { replyCount: replies.length, lastActivityAt: new Date() });

    await Thread.create({
      authorId: created.demo_runner._id, title: 'Knee aches after running, then feels fine',
      body: 'My knee aches during and just after runs but is fine the next morning. I have cut my distance in half. Does anyone have advice on when to stop and get it checked?',
      region: region(parts.knee), painTypes: ['aching', 'throbbing'],
    });
    await Thread.create({
      authorId: created.demo_desk_job._id, title: 'Chronic lower back ache from sitting all day',
      body: 'Eight hours at a desk and my lower back has a dull constant ache by the afternoon. I have tried a standing desk. Curious what has worked for others living with this.',
      region: region(parts.back), painTypes: ['dull', 'aching'],
    });
    console.log('Created demo threads and replies');
  }

  // --- urology community threads (bladder cancer, fertility), no body-region link
  if (!(await Thread.exists({ authorId: created.demo_survivor._id }))) {
    const t = await Thread.create({
      authorId: created.demo_survivor._id, title: 'Three years cancer-free — what I wish I had known at diagnosis',
      body: 'I was diagnosed with early-stage bladder cancer after months of blaming blood in my urine on a UTI. TURBT plus a round of BCG and I have had clear cystoscopies ever since. If you are newly diagnosed: the surveillance cystoscopies get less scary each time, and it is okay to ask your urologist to explain grade and stage in plain language — I did not understand mine at first either.',
      group: 'bladder-cancer', lastActivityAt: new Date(),
    });
    await Reply.create({ threadId: t._id, authorId: created.demo_desk_job._id, body: 'Thank you for writing this. My dad was just diagnosed and the staging terminology has been the hardest part for our family to follow.' });
    await Thread.updateOne({ _id: t._id }, { replyCount: 1, lastActivityAt: new Date() });
  }
  if (!(await Thread.exists({ authorId: created.demo_ttc._id }))) {
    const t = await Thread.create({
      authorId: created.demo_ttc._id, title: 'Starting male-factor fertility testing next week — nervous',
      body: 'After a year of trying, my partner’s workup came back normal so I am the one seeing a urologist for a semen analysis and hormone panel next week. Trying not to catastrophize before I even have results. Has anyone been through the male-side workup and can say what to actually expect at the appointment?',
      group: 'fertility', lastActivityAt: new Date(),
    });
    await Reply.create({ threadId: t._id, authorId: created.demo_swimmer._id, body: 'My husband went through this. The appointment itself was quick and low-key — the waiting for lab results was the hard part, not the visit.' });
    await Thread.updateOne({ _id: t._id }, { replyCount: 1, lastActivityAt: new Date() });
    console.log('Created demo urology community threads');
  }

  // --- communities, friends (idempotent, so re-running upgrades an older seed)
  const join = (u, slug) => Membership.updateOne({ userId: u._id, group: slug }, { $setOnInsert: { joinedAt: new Date() } }, { upsert: true });
  const memberships = {
    'chronic-pain': ['demo_gardener', 'demo_swimmer', 'demo_painter', 'demo_desk_job', 'demo_carpenter'],
    'back-neck-pain': ['demo_desk_job', 'demo_carpenter', 'demo_cyclist'],
    osteoarthritis: ['demo_runner', 'demo_hiker', 'demo_swimmer'],
    'bladder-cancer': ['demo_survivor', 'demo_desk_job'],
    fertility: ['demo_ttc', 'demo_swimmer'],
  };
  for (const [slug, handles] of Object.entries(memberships)) for (const h of handles) await join(created[h], slug);
  for (const slug of ['chronic-pain', 'back-neck-pain', 'ibs', 'bladder-cancer', 'fertility']) await join(demo, slug);

  const tag = (title, group) => Thread.updateMany({ title, group: { $exists: false } }, { $set: { group } });
  await tag('Sharp pain in my shoulder when I lift my arm', 'chronic-pain');
  await tag('Chronic lower back ache from sitting all day', 'back-neck-pain');
  await tag('Knee aches after running, then feels fine', 'osteoarthritis');

  const link = (a, b, status) =>
    Friendship.updateOne(
      { pairKey: Friendship.keyFor(a._id, b._id) },
      { $setOnInsert: { requesterId: a._id, recipientId: b._id, status, createdAt: new Date(), ...(status === 'accepted' && { respondedAt: new Date() }) } },
      { upsert: true },
    );
  await link(demo, created.demo_gardener, 'accepted'); // a friend, whose posts appear in the feed
  await link(created.demo_swimmer, demo, 'pending'); // a request waiting for the demo user
  // a recent reply from the friend, so the activity feed has more than one kind of item
  const deskThread = await Thread.findOne({ authorId: created.demo_desk_job._id });
  if (deskThread && !(await Reply.exists({ threadId: deskThread._id, authorId: created.demo_gardener._id }))) {
    await Reply.create({ threadId: deskThread._id, authorId: created.demo_gardener._id, body: 'A standing desk helped me a bit too, but moving around every half hour made the biggest difference.' });
    await Thread.updateOne({ _id: deskThread._id }, { $inc: { replyCount: 1 }, $set: { lastActivityAt: new Date() } });
  }
  console.log('Set up demo communities and friends');

  // --- physiology: readings and exam results for the demo login (idempotent)
  const wk = (n) => new Date(Date.now() - n * 7 * 86400000);
  if (!(await Vital.exists({ userId: demo._id }))) {
    for (let i = 0; i < 14; i++) {
      const w = 13 - i; // oldest first
      await Vital.create({
        userId: demo._id, measuredAt: wk(w),
        systolic: 122 + ((i * 3) % 9), diastolic: 78 + ((i * 2) % 5), heartRate: 64 + ((i * 5) % 9),
        spo2: 97 + (i % 2), respiratoryRate: 14 + (i % 3), temperatureC: 36.5 + (i % 4) * 0.1,
        weightKg: Math.round((79.5 - i * 0.18) * 10) / 10, ...(i % 4 === 0 && { heightCm: 178, waistCm: 90 - i * 0.2 }),
      });
    }
    await Vital.create({ userId: demo._id, measuredAt: new Date(), systolic: 128, diastolic: 82, heartRate: 68, spo2: 98, respiratoryRate: 15, temperatureC: 36.7, weightKg: 77.1, heightCm: 178, waistCm: 87, bodyFatPct: 21.5, note: 'morning, before coffee' });
    console.log('Added demo vital-sign readings');
  }
  if (!(await TestReport.exists({ userId: demo._id, testType: 'Cardiac' }))) {
    const exam = (testName, testType, daysAgoN, results, extra = {}) => TestReport.create({ userId: demo._id, testName, testType, testDate: new Date(Date.now() - daysAgoN * 86400000), results, doctor: { name: 'Dr. Rivera', clinic: 'Physiology & Heart Clinic' }, normal: true, ...extra });
    await exam('Resting ECG', 'Cardiac', 40, { examKind: 'ecg', heartRate: 62, rhythm: 'Normal sinus rhythm', prInterval: 158, qrsDuration: 92, qtcInterval: 418, interpretation: 'Normal resting ECG.' });
    await exam('Echocardiogram', 'Cardiac', 75, { examKind: 'echo', lvef: 62, lvDiastolicDiameter: 48, valves: 'No significant leak or narrowing', wallMotion: 'Normal', interpretation: 'Normal heart size and pumping function.' });
    await exam('Stress test', 'Cardiac', 75, { examKind: 'stress', durationMinutes: 11.5, mets: 12.1, peakHeartRate: 168, peakSystolic: 176, reasonStopped: 'Target heart rate reached', interpretation: 'Good exercise capacity; no concerning changes.' });
    await exam('Holter monitor', 'Cardiac', 120, { examKind: 'holter', durationHours: 24, averageHeartRate: 72, minHeartRate: 49, maxHeartRate: 141, ectopy: 'Occasional isolated extra beats', interpretation: 'Mostly regular rhythm.' }, { notes: 'Occasional extra beats noted; no follow-up needed.' });
    await exam('Heart exam (stethoscope)', 'Cardiac', 12, { examKind: 'auscultation', rhythm: 'Regular', murmur: 'None', extraSounds: 'None', interpretation: 'Normal heart sounds.' });
    await exam('Lung function (spirometry)', 'Physical Exam', 40, { examKind: 'spirometry', fev1: 3.9, fvc: 4.9, fev1FvcRatio: 80, peakFlow: 540, interpretation: 'Normal lung function.' });
    await exam('Fitness test (VO2 max)', 'Physical Exam', 60, { examKind: 'vo2max', vo2max: 42, maxHeartRate: 171, interpretation: 'Good for age.' });
    await exam('6-minute walk test', 'Physical Exam', 60, { examKind: 'walkTest', distanceMeters: 610, startSpo2: 98, endSpo2: 97, interpretation: 'Normal distance.' });
    await exam('Body composition', 'Physical Exam', 30, { examKind: 'bodyComposition', bodyFatPct: 21.5, leanMassKg: 60.4, visceralFat: 7, interpretation: 'Within a typical range.' });
    console.log('Added demo heart and physical exam results');
  }
  if (!(await TestReport.exists({ userId: demo._id, testType: 'Microbiome' }))) {
    const gut = (testName, daysAgoN, results, extra = {}) => TestReport.create({ userId: demo._id, testName, testType: 'Microbiome', testDate: new Date(Date.now() - daysAgoN * 86400000), results, doctor: { name: 'Dr. Okafor', clinic: 'Digestive Health Clinic' }, normal: true, ...extra });
    await gut('Gut microbiome sequencing (stool)', 150, { examKind: 'sequencing', method: '16S rRNA', provider: 'Demo Lab', shannonDiversity: 2.9, observedSpecies: 118, firmicutesPct: 58, bacteroidetesPct: 31, actinobacteriaPct: 6, proteobacteriaPct: 4, bifidobacteriumPct: 3.1, lactobacillusPct: 0.4, akkermansiaPct: 0.8, faecalibacteriumPct: 4.2, interpretation: 'Demo data.' });
    await gut('Gut microbiome sequencing (stool)', 30, { examKind: 'sequencing', method: '16S rRNA', provider: 'Demo Lab', shannonDiversity: 3.3, observedSpecies: 131, firmicutesPct: 54, bacteroidetesPct: 34, actinobacteriaPct: 7, proteobacteriaPct: 3, bifidobacteriumPct: 4.0, lactobacillusPct: 0.5, akkermansiaPct: 1.1, faecalibacteriumPct: 5.6, interpretation: 'Demo data.' });
    await gut('Fecal calprotectin', 90, { examKind: 'calprotectin', calprotectin: 138, interpretation: 'Demo data: borderline.' }, { normal: false });
    await gut('Fecal calprotectin', 25, { examKind: 'calprotectin', calprotectin: 42, interpretation: 'Demo data.' });
    await gut('Breath test (SIBO, lactose, fructose)', 60, { examKind: 'breathTest', substrate: 'Lactulose', baselineHydrogen: 6, hydrogenRise: 12, peakMethane: 4, minutesToRise: 110, interpretation: 'Demo data.' });
    console.log('Added demo gut microbiome results');
  }

  // --- two reference ultrasound reports (male and female), for demoing the Imaging/scan report type.
  // Findings are plausible normal-reference text, not a real scan — clearly labelled as such below.
  // `organIds` lists every id — from both the 2D diagram (urologyInfo.ts) and the 3D model
  // (extract-urology.js) — that should surface this image when clicked. The 3D model has no
  // uterus/ovary geometry (adult-male-only dataset), so those images only key off the 2D id.
  const img = (organIds, label, view, file) => ({ organIds, label, view, url: `/images/ultrasound/${file}` });
  const MALE_SCAN_IMAGES = [
    img(['kidneys', 'right-kidney'], 'Right kidney', 'Sagittal', 'male-right-kidney-sag.png'),
    img(['kidneys', 'left-kidney'], 'Left kidney', 'Sagittal', 'male-left-kidney-sag.png'),
    img(['bladder'], 'Urinary bladder', 'Transverse', 'male-bladder-trv.png'),
    img(['prostate'], 'Prostate (TRUS)', 'Axial', 'male-prostate-ax.png'),
  ];
  const FEMALE_SCAN_IMAGES = [
    img(['kidneys', 'right-kidney'], 'Right kidney', 'Sagittal', 'female-right-kidney-sag.png'),
    img(['kidneys', 'left-kidney'], 'Left kidney', 'Sagittal', 'female-left-kidney-sag.png'),
    img(['bladder'], 'Urinary bladder', 'Transverse', 'female-bladder-trv.png'),
    img(['uterus'], 'Uterus', 'Sagittal', 'female-uterus-sag.png'),
    img(['ovaries'], 'Right ovary', 'Transverse', 'female-right-ovary-trv.png'),
    img(['ovaries'], 'Left ovary', 'Transverse', 'female-left-ovary-trv.png'),
  ];
  // The right kidney carries a small nonobstructing stone (see gen-ultrasound.py) so the two sides
  // — and the report's own Normal/Abnormal badge — visibly differ, instead of a purely-normal demo.
  const MALE_FINDINGS = 'Right kidney: normal size and echotexture, 10.8 cm, with a 6 mm echogenic focus with posterior '
    + 'acoustic shadowing in the lower pole collecting system, consistent with a nonobstructing calculus. No hydronephrosis. '
    + 'Left kidney: normal size and echotexture, 11.0 cm, no hydronephrosis or calculi. '
    + 'Bladder: normal wall thickness, no masses; post-void residual 15 mL. '
    + 'Prostate: normal size and contour, estimated volume 22 mL, no focal lesion. '
    + 'Impression: 6 mm nonobstructing right renal calculus; otherwise normal renal, bladder and prostate ultrasound.';
  const FEMALE_FINDINGS = 'Right kidney: normal size and echotexture, 10.5 cm, with a 6 mm echogenic focus with posterior '
    + 'acoustic shadowing in the lower pole collecting system, consistent with a nonobstructing calculus. No hydronephrosis. '
    + 'Left kidney: normal size and echotexture, 10.7 cm, no hydronephrosis or calculi. '
    + 'Bladder: normal wall thickness, no masses; well distended at time of scan. '
    + 'Uterus: anteverted, normal size and contour, endometrial stripe within normal limits. '
    + 'Ovaries: both normal in size with a normal follicular pattern; no adnexal mass. '
    + 'Impression: 6 mm nonobstructing right renal calculus; otherwise normal renal and pelvic ultrasound.';
  if (!(await TestReport.exists({ userId: demo._id, 'results.imaging.bodyRegion': /prostate/i }))) {
    const scan = (testName, daysAgoN, imaging) => TestReport.create({
      userId: demo._id, testName, testType: 'Imaging', testDate: new Date(Date.now() - daysAgoN * 86400000),
      results: { imaging },
      doctor: { name: 'Dr. Whitfield', clinic: 'Riverside Radiology' },
      notes: 'Reference example for product demos — not a real scan.',
      normal: false,
    });
    await scan('Ultrasound — Kidneys, bladder and prostate', 45, {
      modality: 'Ultrasound', bodyRegion: 'Kidneys, bladder and prostate',
      findings: MALE_FINDINGS,
      images: MALE_SCAN_IMAGES,
    });
    await scan('Ultrasound — Kidneys, bladder, uterus and ovaries', 45, {
      modality: 'Ultrasound', bodyRegion: 'Kidneys, bladder, uterus and ovaries',
      findings: FEMALE_FINDINGS,
      images: FEMALE_SCAN_IMAGES,
    });
    console.log('Added demo ultrasound reports');
  } else {
    // Backfill: reports created by an older version of this seed predate the `images` library and
    // the right-kidney-stone finding. Re-running the seed should still upgrade them (see file header).
    const male = await TestReport.findOne({ userId: demo._id, 'results.imaging.bodyRegion': /prostate/i });
    const female = await TestReport.findOne({ userId: demo._id, 'results.imaging.bodyRegion': /uterus/i });
    for (const [report, images, findings] of [[male, MALE_SCAN_IMAGES, MALE_FINDINGS], [female, FEMALE_SCAN_IMAGES, FEMALE_FINDINGS]]) {
      if (!report) continue;
      const imaging = report.results.get('imaging');
      if (imaging && (!imaging.images || imaging.findings !== findings)) {
        report.results.set('imaging', { ...imaging, images, findings });
        report.normal = false;
        report.markModified('results');
        await report.save();
        console.log(`Backfilled scan images/findings onto "${report.testName}"`);
      }
    }
  }

  // --- enough pain logs for the demo login to try AI insights (idempotent)
  if (!(await PainEntry.exists({ userId: demo._id }))) {
    const shoulderPart = parts.shoulder;
    const sets = [
      [['sharp'], 6, 20, 'comes-and-goes', ['Movement']], [['sharp', 'aching'], 7, 16, 'getting-worse', ['Movement', 'Lying down']],
      [['aching'], 5, 13, 'constant', ['Lying down']], [['sharp'], 6, 9, 'comes-and-goes', ['Movement']],
      [['aching', 'stiffness'], 4, 6, 'constant', ['Cold']], [['sharp', 'burning'], 7, 3, 'getting-worse', ['Movement']],
      [['aching'], 5, 1, 'comes-and-goes', ['Rest helps']],
    ];
    let k = 0;
    for (const [painTypes, severity, ago, pattern, triggers] of sets) {
      await PainEntry.create({ userId: demo._id, ...entry(shoulderPart, k++, { painTypes, severity, onset: days(ago), pattern, triggers, visibility: 'private', status: 'active' }) });
    }
    console.log('Added demo pain log entries');
  }


  console.log(`\nDone. Sign in with  ${DEMO_LOGIN.email}  /  ${DEMO_LOGIN.password}\n(Demo members are named demo_* and cannot log in with a guessable password.)`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
