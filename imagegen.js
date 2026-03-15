// imagegen.js — Serena's image generation engine
// Uses Gemini image generation to create social media graphics
// Then posts via upload-post.com to Instagram + X

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('./logger');

const GEMINI_KEY  = 'AIzaSyDlnWneoUWEpsOASiEIsz4asQ6KIKcKA-g';
const UPLOAD_KEY  = fs.readFileSync(path.join(os.homedir(), '.openclaw/secrets/uploadpost-api-key.txt'), 'utf8').trim();
const SCRIPT_PATH = '/opt/homebrew/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py';
const OUTPUT_DIR  = path.join(os.homedir(), 'Desktop/openclaw-outputs');

// ── Image Templates ────────────────────────────────────────────────────────
const IMAGE_TEMPLATES = [
  {
    id: 'health-myth',
    prompt: 'Bold, eye-catching Instagram health education graphic. Clean white or soft teal background. Bold text headline: "{headline}". Subtext below: "{subtext}". Small stethoscope icon. Medical professional aesthetic. No faces. Square format. Modern and trustworthy.',
    captions: [
      { headline: 'The 8 glasses of water rule?', subtext: 'Made up. Your thirst is the real guide.' },
      { headline: 'Your urine color tells you more than any water app.', subtext: 'Pale yellow = hydrated. Dark = drink up.' },
      { headline: 'Detox teas do not detox anything.', subtext: 'Your liver does that. For free.' },
      { headline: 'Your doctor said everything is normal. It might not be.', subtext: 'Here is what to actually ask.' },
    ],
  },
  {
    id: 'nurse-wellness',
    prompt: 'Warm, professional wellness tip graphic for nurses. Soft background with calming colors. Bold headline: "{headline}". Supportive subtext: "{subtext}". Clean, Instagram-ready. No faces. Square format.',
    captions: [
      { headline: '5 things I do as a nurse to actually sleep after nights.', subtext: 'It took me years to figure this out.' },
      { headline: 'The one supplement a nurse actually recommends.', subtext: 'Hint: it is not what influencers are selling.' },
      { headline: 'What I eat on a 12-hour shift.', subtext: 'Chaos. But here is what actually helps.' },
    ],
  },
  {
    id: 'nurse-humor',
    prompt: 'Funny, relatable social media graphic for nurses. Clean background, bold readable text. Large funny text: "{joke}". Small tagline: "@BrookeThatRN -- your nurse bestie". No faces, no people. Instagram square format.',
    captions: [
      { joke: 'Me: I am not going to bring work home. Also me: assessing everyone at Thanksgiving.' },
      { joke: 'Day 3 of nights. Everything is fine. (Nothing is fine.)' },
      { joke: 'Your nurse friend will tell you what your doctor did not have time to.' },
      { joke: 'How are you so calm? 20 years of ICU. The bar is underground.' },
    ],
  },
  {
    id: 'health-advice',
    prompt: 'Professional health information graphic. Clean, medical-adjacent design. Bold headline: "{headline}". Simple supporting text: "{subtext}". Stethoscope or medical cross icon. Trustworthy and clear. No faces. Instagram square.',
    captions: [
      { headline: 'Signs your body is trying to tell you something.', subtext: 'And you are probably ignoring it.' },
      { headline: 'The 3 numbers you need to know about your heart.', subtext: 'A nurse breaks it down simply.' },
      { headline: 'What to say when your doctor says everything looks normal.', subtext: 'Exact questions to ask.' },
    ],
  },
];

// ── Generate Image ─────────────────────────────────────────────────────────
async function generateImage(prompt, filename = null) {
  const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = path.join(OUTPUT_DIR, filename || `serena-${ts}.png`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  logger.info(`[imagegen] Generating image: ${prompt.slice(0, 80)}...`);

  const safePrompt = prompt
    .replace(/"/g, "'")
    .replace(/\\/g, '')
    .replace(/\n/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();

  try {
    execSync(
      `uv run "${SCRIPT_PATH}" --prompt "${safePrompt}" --filename "${out}" --resolution 1K`,
      { env: { ...process.env, GEMINI_API_KEY: GEMINI_KEY }, timeout: 60000 }
    );

    if (fs.existsSync(out)) {
      logger.info(`[imagegen] ✅ Image saved: ${out}`);
      return out;
    }
    throw new Error('Image file not created');
  } catch (err) {
    logger.error(`[imagegen] Generation failed: ${err.message}`);
    throw err;
  }
}

// ── Post Image to Socials ──────────────────────────────────────────────────
async function postImageToSocials(imagePath, caption, platforms = ['instagram', 'x']) {
  logger.info(`[imagegen] Posting to: ${platforms.join(', ')}`);

  const form = new FormData();
  form.append('user', 'NerdGGTeam');
  platforms.forEach(p => form.append('platform[]', p));
  form.append('title', caption.slice(0, 2200));
  form.append('photos[]', fs.createReadStream(imagePath), {
    filename: path.basename(imagePath),
    contentType: 'image/png',
  });

  const res = await axios.post('https://api.upload-post.com/api/upload_photos', form, {
    headers: { 'Authorization': `Apikey ${UPLOAD_KEY}`, ...form.getHeaders() },
    timeout: 60000,
    maxBodyLength: Infinity,
  });

  const results = res.data?.results || {};
  const summary = [];
  for (const [platform, r] of Object.entries(results)) {
    if (r.success) {
      logger.info(`[imagegen] ✅ ${platform}: ${r.url}`);
      summary.push({ platform, success: true, url: r.url });
    } else {
      logger.error(`[imagegen] ❌ ${platform}: ${r.error}`);
      summary.push({ platform, success: false, error: r.error });
    }
  }
  return summary;
}

// ── Daily Image Post ───────────────────────────────────────────────────────
async function createAndPostDailyImage(btcChange = null) {
  const day      = new Date().getDay();
  const template = IMAGE_TEMPLATES[day % IMAGE_TEMPLATES.length];
  const caption  = template.captions[Math.floor(Math.random() * template.captions.length)];

  let prompt = template.prompt;
  if (caption.headline) prompt = prompt.replace('{headline}', caption.headline);
  if (caption.subtext)  prompt = prompt.replace('{subtext}', caption.subtext);
  if (caption.joke)     prompt = prompt.replace('{joke}', caption.joke);

  const igCaption = caption.headline
    ? `${caption.headline}\n\n${caption.subtext || ''}\n\nSave this for later 💉\n\n#nurse #nurselife #healthtips #wellness #RN #nursing #healthfacts #selfcare #medicaladvice #nursetok`
    : `${caption.joke || ''}\n\n#nurse #nursehumor #nurselife #nursetok #nursesoftiktok #healthtips #RN #nursing`;

  const imagePath = await generateImage(prompt);
  const results   = await postImageToSocials(imagePath, igCaption);
  return { imagePath, results, caption };
}

module.exports = { generateImage, postImageToSocials, createAndPostDailyImage };
