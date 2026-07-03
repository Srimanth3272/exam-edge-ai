const express = require('express');
const path = require('path');
const cron = require('node-cron');
const fs = require('fs');
const { updateCurrentAffairs } = require('./updater');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// ── IN-MEMORY CACHE FOR HIGH CONCURRENCY ────────────────────
let cachedData = null;

function loadDataToCache() {
  try {
    const dataPath = path.join(__dirname, 'latest_data.json');
    if (fs.existsSync(dataPath)) {
      cachedData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      console.log('✅ Data loaded into memory cache.');
    } else {
      console.log('⚠️ No latest_data.json found on startup.');
    }
  } catch (err) {
    console.error('Error loading data to cache:', err);
  }
}

// Initial load on server start
loadDataToCache();

// ── MONGODB & USER SCHEMA ───────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examedge';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_examedge';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Database'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isSubscribed: { type: Boolean, default: false },
  subscriptionExpiry: { type: Date, default: null }
});
const User = mongoose.model('User', userSchema);

// ── RAZORPAY CONFIGURATION ──────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_123',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret_123'
});

// ── AUTHENTICATION ROUTES ───────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET);
    res.json({ success: true, token, isSubscribed: user.isSubscribed });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    // Check if subscription expired
    let subStatus = user.isSubscribed;
    if (subStatus && user.subscriptionExpiry < new Date()) {
      user.isSubscribed = false;
      await user.save();
      subStatus = false;
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET);
    res.json({ success: true, token, isSubscribed: subStatus });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── MIDDLEWARE TO VERIFY TOKEN ──────────────────────────────
const verifyToken = async (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return next(); // Guest user

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) {
      req.userEmail = user.email;
      if (user.isSubscribed && user.subscriptionExpiry > new Date()) {
        req.isSubscribed = true;
      }
    }
  } catch (err) {
    // Invalid token, treat as guest
  }
  next();
};

// ── SUBSCRIPTION / PAYMENT ROUTES ───────────────────────────
app.get('/api/razorpay-key', (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID });
});

app.post('/api/create-order', async (req, res) => {
  try {
    const options = {
      amount: 2900, // ₹29 in paise
      currency: 'INR',
      receipt: 'receipt_order_' + Date.now()
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Error creating Razorpay order' });
  }
});

app.post('/api/verify-payment', verifyToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email } = req.body;
    
    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret_123';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed: Invalid signature' });
    }
    
    // Update user subscription (30 days)
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    
    const userEmail = req.userEmail || email;
    const user = await User.findOneAndUpdate(
      { email: userEmail },
      { isSubscribed: true, subscriptionExpiry: expiry },
      { new: true }
    );
    
    if (user) {
      res.json({ success: true, message: 'Payment successful! Subscription unlocked.' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// ── GET LATEST DATA ENDPOINT ────────────────────────────────
app.get('/api/latest-data', verifyToken, (req, res) => {
  if (cachedData) {
    if (req.isSubscribed) {
      // Premium User: Gets all data
      res.json(cachedData);
    } else {
      // Free User: Gets only ticker and 2 topics. Rest is blocked.
      const freemiumData = {
        ...cachedData,
        topicCards: cachedData.topicCards.slice(0, 2), // Only 2 free topics
        mcqData: [] // No MCQs for free users
      };
      res.json(freemiumData);
    }
  } else {
    // If not in cache, fallback to reading file or return error
    try {
      const dataPath = path.join(__dirname, 'latest_data.json');
      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        cachedData = data;
        
        if (req.isSubscribed) {
          res.json(data);
        } else {
          res.json({
            ...data,
            topicCards: data.topicCards.slice(0, 2),
            mcqData: []
          });
        }
      } else {
        res.status(404).json({ error: 'Latest data file not found.' });
      }
    } catch (err) {
      console.error('Error reading latest_data.json:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
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
    // Refresh the in-memory cache with the new data
    loadDataToCache();
    res.json({ success: true, message: 'Current affairs updated successfully!' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to update current affairs. Please check API quota or logs.' });
  }
});

// ── SCHEDULED CRON JOB (DAILY AT 7:00 AM) ──────────────────
cron.schedule('0 7 * * *', async () => {
  console.log('⏰ [Cron Job] Executing scheduled daily update at 07:00 AM...');
  const success = await updateCurrentAffairs();
  if (success) {
    // Refresh the cache automatically after the daily update
    loadDataToCache();
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

app.listen(PORT, () => {
  console.log(`🚀 ExamEdge AI Automated Server running on http://localhost:${PORT}`);
  console.log(`⏰ Daily auto-update cron scheduled for 07:00 AM (Asia/Kolkata)`);
});
