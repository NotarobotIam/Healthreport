// Thin wrapper so server.js can start the research refresher without tests ever doing so.
const { startRefresher } = require('./pubmed');

function startResearchRefresher() {
  if (process.env.DISABLE_RESEARCH_REFRESH === '1') return () => {};
  return startRefresher();
}

module.exports = { startResearchRefresher };
