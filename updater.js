const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const parser = new Parser({
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
});

const RSS_FEEDS = [
  'https://www.thehindu.com/news/national/feeder/default.rss',
  'https://www.livemint.com/rss/news',
  'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms'
];

async function updateCurrentAffairs() {
  console.log('🔄 [AI Updater] Starting automated news scraping & Gemini AI generation...');
  const startTime = Date.now();
  
  try {
    let newsItems = [];

    // 1. Fetch from GNews API (Optional)
    if (process.env.GNEWS_API_KEY && process.env.GNEWS_API_KEY !== '9f75532024cfe3b378aa4bc0453557d2') {
      try {
        console.log(`📰 Fetching top Indian headlines from GNews API...`);
        const gnewsUrl = `https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=in&max=10&apikey=${process.env.GNEWS_API_KEY}`;
        const res = await fetch(gnewsUrl, { timeout: 3000 });
        const gnewsData = await res.json();
        if (gnewsData.articles && gnewsData.articles.length > 0) {
          gnewsData.articles.forEach(art => {
            newsItems.push({
              title: art.title,
              summary: art.description || art.content || '',
              link: art.url,
              pubDate: art.publishedAt,
              source: art.source.name || 'GNews'
            });
          });
          console.log(`✅ Fetched ${gnewsData.articles.length} premium articles from GNews.`);
        }
      } catch (err) {
        console.error(`⚠️ Error fetching GNews:`, err.message);
      }
    }

    // 2. Fetch from RSS Feeds in PARALLEL for maximum speed
    console.log(`📰 Fetching RSS feeds in parallel...`);
    const feedPromises = RSS_FEEDS.map(feedUrl => 
      parser.parseURL(feedUrl).catch(err => {
        console.error(`⚠️ Error fetching feed ${feedUrl}:`, err.message);
        return null;
      })
    );
    
    const feeds = await Promise.all(feedPromises);
    feeds.forEach(feed => {
      if (feed && feed.items) {
        feed.items.slice(0, 6).forEach(item => {
          newsItems.push({
            title: item.title,
            summary: item.contentSnippet || item.content || '',
            link: item.link,
            pubDate: item.pubDate,
            source: feed.title || 'Indian News Source'
          });
        });
      }
    });

    if (newsItems.length === 0) {
      console.error('❌ No news items fetched from GNews or RSS feeds. Aborting update.');
      return false;
    }

    console.log(`✅ Successfully aggregated ${newsItems.length} news items in ${(Date.now() - startTime)/1000}s. Sending to Google Gemini AI...`);

    // 3. Prepare Current Date Strings
    const now = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} | ${days[now.getDay()]}`;
    const archiveDateStr = `📅 ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    // 4. Initialize Google Gemini AI
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is not set in .env file.');
      return false;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const prompt = `
You are a Senior Paper Setter and Expert Educator for Indian Government Competitive Examinations (UPSC CSE, SSC CGL, Banking PO, RBI Grade B, Railways, Defence NDA/CDS, and State PSCs).

I will facilitate you with a list of recent news articles scraped from major Indian news publications today. 
Your task is to analyze these news items and generate a comprehensive, premium daily current affairs study package formatted strictly as a JSON object.

Here are the news items:
${JSON.stringify(newsItems.slice(0, 18), null, 2)}

You must return ONLY a raw JSON object matching the exact structure below. Do not include any markdown formatting, explanation, or conversational text outside the JSON block.

REQUIRED JSON STRUCTURE:
{
  "date": "${dateStr}",
  "archiveDate": "${archiveDateStr}",
  "tickerItems": [
    // 5 to 6 punchy one-line summaries of the top news items for the live ticker
  ],
  "topicCards": [
    // 3 to 4 detailed topic cards covering major news in Polity, Economy, Environment, Science & Tech, Defence, or Awards
    {
      "id": "card-unique-id",
      "category": "polity", // must be one of: polity, economy, environment, science, ir, awards
      "catBadge": "⚖️ Polity | Governance", // appropriate emoji and label
      "examTags": ["UPSC", "SSC", "Banking", "State PSC", "Railways"],
      "title": "Clear, exam-oriented title of the topic",
      "sources": [
        { "name": "The Hindu / PIB", "url": "https://www.thehindu.com" }
      ],
      "sourceDate": "Verified: ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}",
      "keyFactsTitle": "📌 Key Facts at a Glance",
      "keyFacts": [
        // 3 to 4 key factual data points
        { "icon": "🗓️", "title": "Key Aspect", "desc": "Detailed factual description" }
      ],
      "examinerPerspective": [
        // 3 bullet points explaining how an examiner/paper setter would frame questions from this topic, traps to avoid, static GK linkages, etc.
      ],
      "examRelevance": [
        // Breakdown of relevance for 3 specific exams
        { "exam": "UPSC Prelims", "note": "Relevance description" },
        { "exam": "SSC CGL", "note": "Relevance description" },
        { "exam": "Banking/RBI", "note": "Relevance description" }
      ]
    }
  ],
  "mcqData": [
    // 5 to 6 high-quality practice MCQs based on today's news and static linkages (Daily Power Quiz)
    {
      "id": "q1",
      "num": "01",
      "topic": "Topic Name",
      "q": "Clear multiple choice question text?",
      "opts": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 1, // integer index of correct option (0 to 3)
      "explanation": "Detailed explanation of why the option is correct and background info."
    }
  ],
  "mainsQuestions": [
    // 2 Mains answer writing questions (GS-1, GS-2, GS-3 level)
    {
      "num": "01",
      "paperTag": "GS-2 | 250 Words",
      "q": "Mains question text...",
      "hint": "Key angles: Point 1 → Point 2 → Point 3"
    }
  ],
  "summaryTable": [
    // 6 to 8 quick revision table rows
    { "num": 1, "topic": "Topic Name", "data": "Must-remember facts summary", "source": "Source Name", "exams": "Target Exams", "gs": "GS Paper" }
  ]
}
`;

    const modelsToTry = [
      { name: 'gemini-2.5-flash', temp: 0.2 },
      { name: 'gemini-2.0-flash', temp: 0.2 },
      { name: 'gemini-2.5-pro', temp: 0.2 },
      { name: 'gemini-flash-latest', temp: 0.2 }
    ];

    let result = null;
    let successModel = '';
    
    for (const modConfig of modelsToTry) {
      try {
        console.log(`🤖 Attempting AI generation with model: ${modConfig.name}...`);
        const model = genAI.getGenerativeModel({ model: modConfig.name, generationConfig: { temperature: modConfig.temp } });
        result = await model.generateContent(prompt);
        successModel = modConfig.name;
        console.log(`✅ Successfully generated content using ${successModel}!`);
        break; // Exit loop on success
      } catch (modErr) {
        console.warn(`⚠️ Model ${modConfig.name} failed (${modErr.status || modErr.message}). Trying fallback model...`);
      }
    }

    if (!result) {
      console.error('❌ All Gemini AI models (2.5-flash, 2.0-flash, 2.5-pro, flash-latest) failed due to high server demand or quota limit.');
      return false;
    }

    let responseText = result.response.text().trim();
    
    // Clean markdown code blocks if present
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedData = JSON.parse(responseText);

    // Save to latest_data.json
    const dataPath = path.join(__dirname, 'latest_data.json');
    fs.writeFileSync(dataPath, JSON.stringify(parsedData, null, 2), 'utf-8');
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`🎉 [AI Updater] Successfully updated latest_data.json with fresh Gemini AI content in ${totalTime} seconds!`);
    return true;

  } catch (error) {
    console.error('❌ [AI Updater] Error during update:', error);
    return false;
  }
}

module.exports = { updateCurrentAffairs };

if (require.main === module) {
  updateCurrentAffairs().then(() => process.exit(0));
}
