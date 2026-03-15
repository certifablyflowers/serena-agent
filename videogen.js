// videogen.js — Serena's video content pipeline
// Pipeline: Script → TTS voiceover → Gemini slide images → ffmpeg → upload-post
//
// Output: 30-60 second vertical video (9:16) for YouTube Shorts, TikTok, Instagram Reels
// No face. Text on screen. AI voiceover. Brooke's brand aesthetic.

const { execSync, exec } = require('child_process');
const util  = require('util');
const execP = util.promisify(exec);
const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('./logger');

const GEMINI_KEY  = 'AIzaSyDlnWneoUWEpsOASiEIsz4asQ6KIKcKA-g';
const OPENAI_KEY  = (() => { try { return require('../shared/ai.js') && fs.readFileSync('/dev/null','utf8'); } catch { return null; } })() ||
  (() => { try { return JSON.parse(fs.readFileSync(path.join(os.homedir(), '.openclaw/openclaw.json'), 'utf8')).skills?.entries?.['openai-image-gen']?.apiKey; } catch { return null; } })();
const UPLOAD_KEY  = fs.readFileSync(path.join(os.homedir(), '.openclaw/secrets/uploadpost-api-key.txt'), 'utf8').trim();
const OUTPUT_DIR  = path.join(os.homedir(), 'Desktop/openclaw-outputs');
const IMG_SCRIPT  = '/opt/homebrew/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py';

// ── TTS: Generate voiceover from script ───────────────────────────────────
async function generateVoiceover(text, outputPath) {
  logger.info(`[videogen] Generating voiceover via Gemini TTS (${text.length} chars)...`);

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_KEY}`,
      {
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Aoede' },
            },
          },
        },
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
    );
    const audioData = res.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error('Gemini TTS returned no audio data');
    fs.writeFileSync(outputPath, Buffer.from(audioData, 'base64'));
    logger.info(`[videogen] ✅ Voiceover saved via Gemini TTS`);
    return outputPath;
  } catch (geminiErr) {
    logger.warn(`[videogen] Gemini TTS failed (${geminiErr.message}), falling back to OpenAI...`);
    const res = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      { model: 'tts-1-hd', voice: 'nova', input: text, speed: 0.95 },
      { headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' }, responseType: 'arraybuffer', timeout: 30000 }
    );
    fs.writeFileSync(outputPath, Buffer.from(res.data));
    logger.info(`[videogen] ✅ Voiceover saved via OpenAI TTS (fallback)`);
    return outputPath;
  }
}

// ── Generate a slide image ─────────────────────────────────────────────────
function generateSlideImage(prompt, outputPath) {
  const safePrompt = prompt
    .replace(/"/g, "'")
    .replace(/\\/g, '')
    .replace(/\n/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();

  execSync(
    `uv run "${IMG_SCRIPT}" --prompt "${safePrompt}" --filename "${outputPath}" --resolution 1K`,
    { env: { ...process.env, GEMINI_API_KEY: GEMINI_KEY }, timeout: 60000 }
  );
  return outputPath;
}

// ── Build video from images + audio using ffmpeg ───────────────────────────
async function buildVideo(imagePaths, audioPath, outputPath, durationPerSlide = null) {
  logger.info(`[videogen] Building video from ${imagePaths.length} slides...`);

  // Get audio duration
  let audioDuration = 30;
  try {
    const { stdout } = await execP(
      `ffprobe -i "${audioPath}" -show_entries format=duration -v quiet -of csv="p=0"`
    );
    audioDuration = parseFloat(stdout.trim()) || 30;
  } catch { /* use default */ }

  const slideCount = imagePaths.length;
  const secPerSlide = durationPerSlide || (audioDuration / slideCount);

  logger.info(`[videogen] Audio: ${audioDuration.toFixed(1)}s | ${slideCount} slides @ ${secPerSlide.toFixed(1)}s each`);

  // Write concat list for ffmpeg
  const tmpDir    = path.join(os.tmpdir(), `serena-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const concatFile = path.join(tmpDir, 'concat.txt');

  // Resize all images to 1080x1920 (9:16 vertical) first
  const resizedPaths = [];
  for (let i = 0; i < imagePaths.length; i++) {
    const resized = path.join(tmpDir, `slide-${i}.jpg`);
    execSync(`ffmpeg -y -i "${imagePaths[i]}" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" "${resized}" 2>/dev/null`);
    resizedPaths.push(resized);
  }

  // Build concat file
  const concatContent = resizedPaths
    .map(p => `file '${p}'\nduration ${secPerSlide.toFixed(3)}`)
    .join('\n');
  // Add last frame again (ffmpeg concat demuxer needs it)
  const lastPath = resizedPaths[resizedPaths.length - 1];
  fs.writeFileSync(concatFile, concatContent + `\nfile '${lastPath}'\n`);

  // Build video
  const cmd = `ffmpeg -y \
    -f concat -safe 0 -i "${concatFile}" \
    -i "${audioPath}" \
    -c:v libx264 -preset fast -crf 23 \
    -c:a aac -b:a 128k \
    -pix_fmt yuv420p \
    -movflags +faststart \
    -shortest \
    -t ${(audioDuration + 0.5).toFixed(1)} \
    "${outputPath}" 2>/dev/null`;

  await execP(cmd);

  // Cleanup temp
  try { fs.rmSync(tmpDir, { recursive: true }); } catch {}

  logger.info(`[videogen] ✅ Video built: ${outputPath}`);
  return outputPath;
}

// ── Post video via upload-post ─────────────────────────────────────────────
async function postVideo(videoPath, title, description, platforms = ['youtube', 'x']) {
  logger.info(`[videogen] Posting video to: ${platforms.join(', ')}`);

  const form = new FormData();
  form.append('user', 'NerdGGTeam');
  platforms.forEach(p => form.append('platform[]', p));
  form.append('title', title.slice(0, 100));
  form.append('description', description.slice(0, 5000));
  form.append('video', fs.createReadStream(videoPath), {
    filename: path.basename(videoPath),
    contentType: 'video/mp4',
  });

  const res = await axios.post('https://api.upload-post.com/api/upload', form, {
    headers: { 'Authorization': `Apikey ${UPLOAD_KEY}`, ...form.getHeaders() },
    timeout: 120000,
    maxBodyLength: Infinity,
  });

  // Handle async background upload
  const requestId = res.data?.request_id;
  if (requestId) {
    console.log(`[videogen] Upload in background, polling for request_id: ${requestId}`);
    return await pollUploadStatus(requestId);
  }

  const results = res.data?.results || {};
  const summary = [];
  for (const [platform, r] of Object.entries(results)) {
    if (r.success) {
      console.log(`[videogen] ✅ ${platform}: ${r.url || r.post_id}`);
      summary.push({ platform, success: true, url: r.url || r.post_id });
    } else {
      console.error(`[videogen] ❌ ${platform}: ${r.error}`);
      summary.push({ platform, success: false, error: r.error });
    }
  }
  return summary;
}

// ── Master: Create and Post Daily Video ───────────────────────────────────
async function createAndPostVideo(content) {
  const ts      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const workDir = path.join(OUTPUT_DIR, `video-${ts}`);
  fs.mkdirSync(workDir, { recursive: true });

  const theme   = content.theme || 'Nurse Life';
  const hook    = content.tiktokHook || content.hook || '';
  const script  = buildVideoScript(content);

  logger.info(`[videogen] Creating video — Theme: ${theme}`);

  // 1. Generate voiceover
  const voicePath = path.join(workDir, 'voiceover.mp3');
  await generateVoiceover(script.spoken, voicePath);
  const musicDir  = path.join(__dirname, 'music');
  const audioPath = path.join(workDir, 'mixed-audio.mp3');
//  await mixAudioWithMusic(voicePath, audioPath, musicDir).catch(() => voicePath);

  // 2. Generate slide images (3-5 slides)
  const imagePaths = [];
  for (let i = 0; i < script.slides.length; i++) {
    logger.info(`[videogen] Generating slide ${i + 1}/${script.slides.length}...`);
    const imgPath = path.join(workDir, `slide-${i}.png`);
    generateSlideImage(script.slides[i].imagePrompt, imgPath);
    imagePaths.push(imgPath);
  }

  // 3. Build video
  const videoPath = path.join(workDir, 'serena-video.mp4');
  await buildVideo(imagePaths, voicePath, videoPath);

  // 4. Post to YouTube + Instagram Reels + X
  const ytDescription = buildYouTubeDescription(content);
  const results = await postVideo(videoPath, script.title, ytDescription, ['youtube', 'instagram', 'x', 'tiktok']);

  // Cleanup images (keep video + audio)
  imagePaths.forEach(p => { try { fs.unlinkSync(p); } catch {} });

  return { videoPath, results, script };
}

// ── Build video script from content ───────────────────────────────────────
function buildVideoScript(content) {
  const theme = content.theme || 'Nurse Tips';
  const hook  = content.tiktokHook || content.hook || 'As a nurse, here is something you need to know.';

  // Extract key points from the instagram caption
  const igText = content.instagram || '';
  const lines  = igText.split('\n').filter(l => l.trim().length > 20).slice(0, 4);

  // Build spoken script (what the voiceover says)
  const spoken = [
    hook,
    lines[0] || `Here is what ${theme.toLowerCase()} actually looks like from a nurse's perspective.`,
    lines[1] || 'Most people don\'t know this — but as your nurse friend, I\'m telling you.',
    lines[2] || 'Save this. Share it with someone who needs to hear it. (Or someone you want to gross out.)',
    'Follow for more real health talk from a real nurse.',
  ].join(' ');

  // Build slide prompts (one image per key point)
  const slides = [
    {
      text: hook,
      imagePrompt: `Photorealistic vertical 9:16 portrait. A confident, beautiful Black female nurse in her early 30s wearing navy blue scrubs and a stethoscope, smiling warmly at camera in a bright modern hospital corridor. Soft cinematic lighting, shallow depth of field, bokeh background. Editorial quality, natural makeup. No text overlays. No patients visible.`,
    },
    {
      text: lines[0] || theme,
      imagePrompt: `Photorealistic vertical 9:16 portrait. A confident Black female nurse in navy scrubs, focused and professional, reviewing a medical tablet at a modern ICU workstation. Warm overhead lighting, hospital monitors softly blurred in background. Cinematic composition, editorial photography style. No text overlay. No patient faces visible.`,
    },
    {
      text: lines[1] || 'The truth nurses know',
      imagePrompt: `Photorealistic vertical 9:16 close-up. Black female nurse in navy scrubs carefully adjusting an IV line or checking medical equipment. Hands clearly shown with gloves. Shallow depth of field, hospital room softly blurred. Warm clinical lighting. Cinematic and intimate. No patient faces visible. No text overlay.`,
    },
    {
      text: 'Follow @BrookeThatRN',
      imagePrompt: `Photorealistic vertical 9:16 lifestyle portrait. Confident beautiful Black female nurse in navy scrubs standing outside a modern hospital at golden hour, relaxed and smiling. Cinematic warm tones, shallow depth of field. Aspirational, warm, relatable. No text overlay.`,
    },
  ];

  const title = content.youtube?.title ||
    `The Truth About ${theme} (A Nurse Explains)`;

  return { spoken, slides, title };
}

function buildYouTubeDescription(content) {
  const theme = content.theme || 'Nurse Tips';
  const aff   = content.affiliateUsed ? `\n\n🛒 Products I Recommend:\n${getAffiliateLink(content)}` : '';
  return `${content.instagram?.slice(0, 500) || theme}\n\nI'm Brooke — a Registered Nurse here to make health actually make sense. Real talk, no jargon, no fear.\n\nNew videos weekly. Subscribe so you never miss a thing. 💉\n\n#nurse #health #wellness #nurselife #healthtips${aff}`;
}

function getAffiliateLink(content) {
  try {
    const { PRODUCTS } = require('./affiliates');
    // Find matching product
    for (const [id, p] of Object.entries(PRODUCTS)) {
      if (content.affiliateUsed && content.affiliateUsed.toLowerCase().includes(id.toLowerCase().slice(0, 6))) {
        return `${p.emoji} ${p.name}: ${p.link}`;
      }
    }
  } catch {}
  return '';
}


// ── Poll async upload status ───────────────────────────────────────────────
async function pollUploadStatus(requestId, maxWaitMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 8000));
    try {
      const res = await axios.get(`https://api.upload-post.com/api/uploadposts/status?request_id=${requestId}`, {
        headers: { 'Authorization': `Apikey ${UPLOAD_KEY}` },
        timeout: 15000,
      });
      const data = res.data;
      console.log(`[videogen] Status: ${data.status || 'pending'}`);
      if (data.status === 'done' || data.status === 'completed' || data.results) {
        const results = data.results || {};
        const summary = [];
        for (const [platform, r] of Object.entries(results)) {
          if (r.success || r.url) {
            console.log(`[videogen] ✅ ${platform}: ${r.url || r.post_id}`);
            summary.push({ platform, success: true, url: r.url || r.post_id });
          } else {
            console.error(`[videogen] ❌ ${platform}: ${r.error}`);
            summary.push({ platform, success: false, error: r.error });
          }
        }
        return summary;
      }
      if (data.status === 'failed') {
        return [{ platform: 'all', success: false, error: data.message || 'Upload failed' }];
      }
    } catch (e) {
      console.warn(`[videogen] Status poll error: ${e.message}`);
    }
  }
  return [{ platform: 'all', success: false, error: 'Timed out waiting for upload status' }];
}

module.exports = { createAndPostVideo, generateVoiceover, buildVideo, postVideo };
