// avatarvideo.js
// Generates a talking avatar video using ElevenLabs (voice) + HeyGen (avatar)
// Drop this file into your Serena agent folder

const axios = require('axios');
const FormData = require('form-data');

const HEYGEN_API_KEY    = process.env.HEYGEN_API_KEY;
const HEYGEN_AVATAR_ID  = process.env.HEYGEN_AVATAR_ID;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

// ─── Step 1: Generate voice audio via ElevenLabs ──────────────────────────────
async function generateVoiceAudio(script) {
  console.log('[AvatarVideo] 🎙️  Generating voice with ElevenLabs...');

  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      text: script,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    },
    {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      responseType: 'arraybuffer'
    }
  );

  return Buffer.from(response.data);
}

// ─── Step 2: Upload audio to HeyGen asset storage ─────────────────────────────
async function uploadAudioToHeyGen(audioBuffer) {
  console.log('[AvatarVideo] ☁️  Uploading audio to HeyGen...');

  const formData = new FormData();
  formData.append('file', audioBuffer, {
    filename: 'voice.mp3',
    contentType: 'audio/mpeg'
  });

  const response = await axios.post(
    'https://upload.heygen.com/v1/asset',
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': HEYGEN_API_KEY
      }
    }
  );

  const audioUrl = response.data.data.url;
  console.log('[AvatarVideo] ✅ Audio uploaded:', audioUrl);
  return audioUrl;
}

// ─── Step 3: Submit video generation job to HeyGen ────────────────────────────
async function createHeyGenVideo(audioUrl) {
  console.log('[AvatarVideo] 🎬 Sending video job to HeyGen...');

  const response = await axios.post(
    'https://api.heygen.com/v2/video/generate',
    {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: HEYGEN_AVATAR_ID,
            avatar_style: 'normal'
          },
          voice: {
            type: 'audio',
            audio_url: audioUrl
          }
        }
      ],
      dimension: {
        width: 1080,
        height: 1920  // Vertical format — TikTok / Reels ready
      }
    },
    {
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  const videoId = response.data.data.video_id;
  console.log('[AvatarVideo] 🎞️  Video job queued. ID:', videoId);
  return videoId;
}

// ─── Step 4: Poll HeyGen until the video is ready ─────────────────────────────
async function pollVideoStatus(videoId) {
  console.log('[AvatarVideo] ⏳ Waiting for HeyGen to finish rendering...');

  const maxAttempts = 60;   // 10 mins max (60 x 10s)
  const delayMs = 10000;    // Check every 10 seconds

  for (let i = 0; i < maxAttempts; i++) {
    const response = await axios.get(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      {
        headers: { 'X-Api-Key': HEYGEN_API_KEY }
      }
    );

    const { status, video_url, error } = response.data.data;
    console.log(`[AvatarVideo] Status: ${status} (check ${i + 1}/${maxAttempts})`);

    if (status === 'completed') {
      console.log('[AvatarVideo] ✅ Video ready:', video_url);
      return video_url;
    }

    if (status === 'failed') {
      throw new Error(`[AvatarVideo] ❌ HeyGen render failed: ${error}`);
    }

    // Not done yet — wait and try again
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error('[AvatarVideo] ❌ Timed out waiting for HeyGen video.');
}

// ─── Main export: call this from Serena ───────────────────────────────────────
async function generateAvatarVideo(script) {
  try {
    const audioBuffer = await generateVoiceAudio(script);
    const audioUrl    = await uploadAudioToHeyGen(audioBuffer);
    const videoId     = await createHeyGenVideo(audioUrl);
    const videoUrl    = await pollVideoStatus(videoId);

    return { success: true, videoUrl };

  } catch (err) {
    console.error('[AvatarVideo] ❌ Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { generateAvatarVideo };
