const fs = require('fs');
const code = fs.readFileSync('videogen.js', 'utf8');

const pollFn = `
// ── Poll async upload status ───────────────────────────────────────────────
async function pollUploadStatus(requestId, maxWaitMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 8000));
    try {
      const res = await axios.get(\`https://api.upload-post.com/api/uploadposts/status?request_id=\${requestId}\`, {
        headers: { 'Authorization': \`Apikey \${UPLOAD_KEY}\` },
        timeout: 15000,
      });
      const data = res.data;
      console.log(\`[videogen] Status: \${data.status || 'pending'}\`);
      if (data.status === 'done' || data.status === 'completed' || data.results) {
        const results = data.results || {};
        const summary = [];
        for (const [platform, r] of Object.entries(results)) {
          if (r.success || r.url) {
            console.log(\`[videogen] ✅ \${platform}: \${r.url || r.post_id}\`);
            summary.push({ platform, success: true, url: r.url || r.post_id });
          } else {
            console.error(\`[videogen] ❌ \${platform}: \${r.error}\`);
            summary.push({ platform, success: false, error: r.error });
          }
        }
        return summary;
      }
      if (data.status === 'failed') {
        return [{ platform: 'all', success: false, error: data.message || 'Upload failed' }];
      }
    } catch (e) {
      console.warn(\`[videogen] Status poll error: \${e.message}\`);
    }
  }
  return [{ platform: 'all', success: false, error: 'Timed out waiting for upload status' }];
}
`;

const oldBlock = `  const res = await axios.post('https://api.upload-post.com/api/upload', form, {
    headers: { 'Authorization': \`Apikey \${UPLOAD_KEY}\`, ...form.getHeaders() },
    timeout: 120000,
    maxBodyLength: Infinity,
  });

  const results = res.data?.results || {};
  const summary = [];
  for (const [platform, r] of Object.entries(results)) {
    if (r.success) {
      logger.info(\`[videogen] ✅ \${platform}: \${r.url || r.post_id}\`);
      summary.push({ platform, success: true, url: r.url || r.post_id });
    } else {
      logger.error(\`[videogen] ❌ \${platform}: \${r.error}\`);
      summary.push({ platform, success: false, error: r.error });
    }
  }
  return summary;`;

const newBlock = `  const res = await axios.post('https://api.upload-post.com/api/upload', form, {
    headers: { 'Authorization': \`Apikey \${UPLOAD_KEY}\`, ...form.getHeaders() },
    timeout: 120000,
    maxBodyLength: Infinity,
  });

  // Handle async background upload
  const requestId = res.data?.request_id;
  if (requestId) {
    console.log(\`[videogen] Upload in background, polling for request_id: \${requestId}\`);
    return await pollUploadStatus(requestId);
  }

  const results = res.data?.results || {};
  const summary = [];
  for (const [platform, r] of Object.entries(results)) {
    if (r.success) {
      console.log(\`[videogen] ✅ \${platform}: \${r.url || r.post_id}\`);
      summary.push({ platform, success: true, url: r.url || r.post_id });
    } else {
      console.error(\`[videogen] ❌ \${platform}: \${r.error}\`);
      summary.push({ platform, success: false, error: r.error });
    }
  }
  return summary;`;

let patched = code;

if (!code.includes('pollUploadStatus')) {
  patched = patched.replace('module.exports', pollFn + '\nmodule.exports');
}

if (!code.includes(oldBlock)) {
  console.error('ERROR: Could not find the target block to replace. The file may have already been partially patched.');
  process.exit(1);
}

patched = patched.replace(oldBlock, newBlock);
fs.writeFileSync('videogen.js', patched);
console.log('✅ Patched videogen.js with async polling');
