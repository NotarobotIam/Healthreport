#!/usr/bin/env node
/**
 * Grants a role to an existing member. Run this on the server; there is deliberately no
 * web page or API for creating the first admin, since anything reachable from the internet
 * could be abused to claim it.
 *
 *   npm run make-admin -- <username>              -> admin
 *   npm run make-admin -- <username> moderator    -> moderator
 *   npm run make-admin -- <username> user         -> back to a normal member
 */
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');

async function main() {
  const [handle, role = 'admin'] = process.argv.slice(2);
  if (!handle || !User.USER_ROLES.includes(role)) {
    console.error(`Usage: npm run make-admin -- <username> [${User.USER_ROLES.join('|')}]`);
    process.exit(1);
  }
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  const user = await User.findOne({ handle: handle.toLowerCase() });
  if (!user || user.status === 'deleted') {
    console.error(`No active member with username "${handle}".`);
    await mongoose.disconnect();
    process.exit(1);
  }
  user.role = role;
  await user.save();
  console.log(`${user.handle} is now: ${role}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
