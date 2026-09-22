const mongoose = require('mongoose');

// Which communities a member has joined. This is sensitive (it can reveal a health condition),
// so it is only ever returned to the member themself, and counts are shown only above a threshold.
const membershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: String, required: true, maxlength: 60 },
  joinedAt: { type: Date, default: Date.now },
});

membershipSchema.index({ userId: 1, group: 1 }, { unique: true });
membershipSchema.index({ group: 1 });

module.exports = mongoose.model('Membership', membershipSchema);
