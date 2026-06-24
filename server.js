const express = require('express');
const path = require('path');
const cron = require('node-cron');
const fs = require('fs');
const { updateCurrentAffairs } = require('./updater');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// ── GET LATEST DATA ENDPOINT ────────────────────────────────
app.get('/api/latest-data', (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'latest_data.json');
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'Latest data file not found.' });
    }
  } catch (err) {
    console.error('Error reading latest_data.json:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── FORCE UPDATE ENDPOINT ──────────────────────────────────
let isUpdating = false;
app.post('/api/force-update', async (req, res) => {
  if (isUpdating) {
    console.log('⚠️ Force update requested but an update is already in progress. Throttling request.');
    return res.status(429).json({ success: false, error: 'An AI update is already in progress. Please wait a few seconds...' });
  }

  isUpdating = true;
  console.log('🔄 Force update requested via API...');
  const success = await updateCurrentAffairs();
  isUpdating = false;

  if (success) {
    res.json({ success: true, message: 'Current affairs updated successfully!' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to update current affairs. Please check API quota or logs.' });
  }
});

// ── SCHEDULED CRON JOB (DAILY AT 7:00 AM) ──────────────────
cron.schedule('0 7 * * *', async () => {
  console.log('⏰ [Cron Job] Executing scheduled daily update at 07:00 AM...');
  await updateCurrentAffairs();
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

app.listen(PORT, () => {
  console.log(`🚀 ExamEdge AI Automated Server running on http://localhost:${PORT}`);
  console.log(`⏰ Daily auto-update cron scheduled for 07:00 AM (Asia/Kolkata)`);
});
