const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const logger = require('./logger');

// Post a tweet via xurl (already authenticated as @BrookeThatRN)
async function tweet(text) {
  // Truncate to 280 chars if needed
  const safe = text.slice(0, 280);
  // Escape single quotes
  const escaped = safe.replace(/'/g, "'\\''");

  try {
    const { stdout, stderr } = await execPromise(`xurl post '${escaped}'`);
    const result = JSON.parse(stdout);
    const tweetId = result?.data?.id;
    logger.info(`[twitter] Posted tweet ID: ${tweetId}`);
    return { success: true, id: tweetId, url: `https://x.com/BrookeThatRN/status/${tweetId}` };
  } catch (err) {
    logger.error(`[twitter] Tweet failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// Post a thread (array of strings)
async function thread(tweets) {
  let lastId = null;
  const results = [];

  for (const text of tweets) {
    const safe = text.slice(0, 280).replace(/'/g, "'\\''");
    try {
      let cmd = lastId
        ? `xurl reply ${lastId} '${safe}'`
        : `xurl post '${safe}'`;

      const { stdout } = await execPromise(cmd);
      const result = JSON.parse(stdout);
      lastId = result?.data?.id;
      results.push({ success: true, id: lastId });
      logger.info(`[twitter] Thread tweet posted: ${lastId}`);

      // Small delay between tweets
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      logger.error(`[twitter] Thread tweet failed: ${err.message}`);
      results.push({ success: false, error: err.message });
    }
  }

  return results;
}

module.exports = { tweet, thread };
