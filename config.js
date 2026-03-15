const fs = require('fs');
const os = require('os');
const path = require('path');

const secretsDir = path.join(os.homedir(), '.openclaw', 'secrets');

module.exports = {
  botToken: fs.readFileSync(path.join(secretsDir, 'social-bot-token.txt'), 'utf8').trim(),
  chatId: '6157070475',
  timezone: 'America/Los_Angeles',
  // Content schedule
  morningIdeasCron: '0 8 * * *',    // 8 AM - daily content ideas
  eveningWrapCron: '0 20 * * *',    // 8 PM - trending topics recap
  // Niche
  niche: 'crypto + AI tools',
  platforms: ['X/Twitter', 'TikTok', 'Instagram', 'YouTube Shorts'],
  persona: 'Anonymous faceless creator — no real name, no face, no hospital affiliation',
  goal: 'Build audience + generate income via affiliate links, digital products, paid community',
};
