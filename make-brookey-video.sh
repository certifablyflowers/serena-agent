#!/bin/bash
set -e
source ~/.openclaw/workspace-serena/.env

AVATAR_ID="64a78fb72ef44e0287f76ea30703ffd8"
LOOK_ID="4a5dd11ef6844b5cb87b07628a13bb6d"
VOICE_ID="gE0owC0H9C8SzfDyIUtB"

echo "Step 1: Generating voice with ElevenLabs..."
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The balloon pump isn'\''t keeping them alive. It'\''s buying time while we decide if they'\''re worth saving. That sounds dark. But it'\''s just physics. The balloon inflates when the heart rests, deflates when it squeezes. Diastolic augmentation. Afterload reduction. We don'\''t say that to families. We say, helping the heart recover. What we don'\''t say: sometimes the heart has no intention of recovering. The pump has alarms for everything. Timing drift. Gas leak. Catheter migration. My favorite is the one that goes off when the patient moves too much. Which is code for: they'\''re waking up. And this is about to get complicated. You can always tell who'\''s getting better. Their balloon waveform gets smaller. The heart starts doing its own job. We wean the augmentation, pull the sheath, and they leave the unit talking about how they had a little heart thing. Meanwhile we'\''re restocking the insertion cart for the next one. Some hearts fight back. Some hearts were already done. The balloon just makes it official. C-V-I-C-U. You'\''ll understand eventually.",
    "model_id": "eleven_monolingual_v1",
    "voice_settings": { "stability": 0.5, "similarity_boost": 0.75 }
  }' \
  --output /tmp/brookey-voice.mp3
echo "Voice saved."

echo "Step 2: Converting to WAV and uploading to catbox.moe..."
ffmpeg -i /tmp/brookey-voice.mp3 -ar 44100 -ac 1 -f wav /tmp/brookey-voice.wav -y 2>/dev/null
AUDIO_URL=$(curl -s -F "reqtype=fileupload" -F "fileToUpload=@/tmp/brookey-voice.wav" https://catbox.moe/user/api.php)
echo "Audio URL: $AUDIO_URL"

echo "Step 3: Submitting video job to HeyGen..."
VIDEO_ID=$(curl -s -X POST "https://api.heygen.com/v2/video/generate" \
  -H "X-Api-Key: $HEYGEN_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"video_inputs\": [{
      \"character\": {
        \"type\": \"avatar\",
        \"avatar_id\": \"$AVATAR_ID\",
        \"avatar_style\": \"normal\",
        \"look_id\": \"$LOOK_ID\"
      },
      \"voice\": {
        \"type\": \"audio\",
        \"audio_url\": \"$AUDIO_URL\"
      }
    }],
    \"dimension\": { \"width\": 1080, \"height\": 1920 }
  }" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['video_id'])")
echo "Video ID: $VIDEO_ID"

echo "Step 4: Waiting for HeyGen to render (1-5 mins)..."
while true; do
  RESPONSE=$(curl -s "https://api.heygen.com/v1/video_status.get?video_id=$VIDEO_ID" \
    -H "X-Api-Key: $HEYGEN_API_KEY")
  STATUS=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])")
  echo "Status: $STATUS"
  if [ "$STATUS" = "completed" ]; then
    VIDEO_URL=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['video_url'])")
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "HeyGen render failed."
    exit 1
  fi
  sleep 15
done

echo "Step 5: Downloading video..."
curl -L "$VIDEO_URL" --output /tmp/brookey-iabp.mp4
echo "Video saved to /tmp/brookey-iabp.mp4"

echo "Step 6: Posting to TikTok and Instagram..."
curl -s -X POST https://api.upload-post.com/api/upload \
  -H "Authorization: Apikey $UPLOAD_POST_API_KEY" \
  -F "video=@/tmp/brookey-iabp.mp4" \
  -F "title=The balloon pump isn'\''t keeping them alive. It'\''s buying time. #CVICU #CriticalCare #NurseLife #ICUnurse #NursingTwitter" \
  -F "user=NerdGGTeam" \
  -F "platform[]=tiktok" \
  -F "platform[]=instagram"

echo "All done! Video posted."
