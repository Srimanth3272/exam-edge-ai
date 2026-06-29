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
You are a Senior Paper Setter and Expert Educator for Indian Government Competitive Examinations (UPSC CSE, SSC CGL, Banking PO, RBI Grade B, Railways, Defence NDA/CDS, APPSC, TSPSC and all State PSCs).

I will provide you with a list of recent news articles scraped from major Indian news publications today.
Your task is to analyze these news items and generate a COMPREHENSIVE, PREMIUM daily current affairs study package formatted strictly as a JSON object.

Here are the news items:
${JSON.stringify(newsItems.slice(0, 18), null, 2)}

You must return ONLY a raw JSON object matching the exact structure below. Do NOT include any markdown formatting, explanation, or conversational text outside the JSON block.

CRITICAL INSTRUCTIONS:
1. Generate topic cards for ALL 12 categories listed — not just polity/economy. ALWAYS generate at least one card for: days (important days with themes), sports (recent sports news/achievements), culture (festivals, dance forms, cultural events), appointments (new govt/intl appointments), books (books and authors in news), heritage (UNESCO/ASI sites in news).
2. For each card, include "staticGkPoints" — these are STATIC GK facts that LINK to the current affairs topic. Examples: founding year, constitutional article, world ranking, India's first, headquarters, governing body, year established.
3. Generate at least 12 MCQs covering ALL topic categories — at least 1 MCQ each from: days, sports, culture, appointments, books, heritage, plus the original categories.
4. MCQ topics MUST be listed as their category name (e.g. "Sports", "Important Days", "Culture & Dance", "Appointments", "Books & Authors", "Heritage Sites").

REQUIRED JSON STRUCTURE:
{
  "date": "${dateStr}",
  "archiveDate": "${archiveDateStr}",
  "tickerItems": [
    // 6 to 8 punchy one-line summaries of top news for the live ticker — include sports, days, appointments
  ],
  "topicCards": [
    // MANDATORY: Generate 8 to 12 detailed topic cards covering ALL 12 categories.
    // Always include at least one card each for: polity, economy, science, awards, days, sports, culture, appointments, books, heritage
    {
      "id": "card-unique-id",
      "category": "polity",
      // category MUST be one of: polity, economy, environment, science, ir, awards, days, sports, culture, appointments, books, heritage
      "catBadge": "⚖️ Polity | Governance",
      // catBadge emoji + label must match category:
      // days → "📅 Important Days & Themes"
      // sports → "🏅 Sports | Achievements & Events"
      // culture → "🎭 Culture | Festivals & Dance"
      // appointments → "👔 New Appointments & Positions"
      // books → "📚 Books & Authors in News"
      // heritage → "🏛️ Heritage Sites | UNESCO & ASI"
      "examTags": ["UPSC", "SSC", "Banking", "State PSC", "Railways"],
      "title": "Clear, exam-oriented title of the topic",
      "sources": [
        { "name": "The Hindu / PIB", "url": "https://www.thehindu.com" }
      ],
      "sourceDate": "Verified: ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}",
      "keyFactsTitle": "📌 Key Facts at a Glance",
      "keyFacts": [
        // 4 to 6 key factual data points
        // For "days" cards: include the date, theme, observing body, first observed year, and significance
        // For "sports" cards: include athlete name, event, result, state, and governing body
        // For "culture" cards: include festival name, state/region, date, deity/theme, and cultural significance
        // For "appointments" cards: include person, new post, organisation, term, and predecessor
        // For "books" cards: include book title, author, publisher/award, theme, and literary significance
        // For "heritage" cards: include site name, state, UNESCO year, type (cultural/natural), and ASI status
        { "icon": "🗓️", "title": "Key Aspect", "desc": "Detailed factual description" }
      ],
      "staticGkPoints": [
        // REQUIRED: 3 to 5 static GK facts that LINK to this topic.
        // These must be specific, verifiable facts that examiners ask in MCQs.
        // Examples: "UNHCR established 1950 | HQ Geneva | India NOT signatory to 1951 Refugee Convention"
        // Examples: "Sangeet Natak Akademi est 1952 | under Ministry of Culture | distinct from Sahitya Akademi (1954)"
        // Examples: "D. Gukesh = youngest World Chess Champion 2024 at age 18 | defeated Ding Liren | FIDE HQ Lausanne"
        "Static GK fact 1 — must include founding year OR constitutional article OR headquarters OR India ranking",
        "Static GK fact 2",
        "Static GK fact 3"
      ],
      "examinerPerspective": [
        // 4 bullet points explaining paper-setter traps, commonly confused facts, static linkages, and which exam specifically asks this
      ],
      "examRelevance": [
        { "exam": "UPSC Prelims", "note": "Specific relevance to UPSC" },
        { "exam": "SSC CGL", "note": "Specific relevance to SSC" },
        { "exam": "Banking/RBI", "note": "Specific relevance to Banking" },
        { "exam": "State PSC", "note": "Regional relevance" }
      ]
    }
  ],
  "mcqData": [
    // MANDATORY: Generate at least 12 high-quality MCQs.
    // MUST include at least 1 MCQ each from these topics: Important Days, Sports, Culture & Dance, Appointments, Books & Authors, Heritage Sites
    // Also include MCQs from: Polity, Economy, Science & Tech, Environment, Awards, Defence/IR
    // Each MCQ must test a specific fact that appears in competitive exam papers
    {
      "id": "q1",
      "num": "01",
      "topic": "Important Days",
      // topic MUST match one of: "Important Days", "Sports", "Culture & Dance", "Appointments", "Books & Authors", "Heritage Sites", "Polity", "Economy", "Science", "Environment", "Awards", "Defence", "BRICS", "Biodiversity", "Finance"
      "q": "Clear multiple choice question — include specific year or data to make it precise?",
      "opts": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 1,
      "explanation": "Detailed explanation including WHY this is correct AND what the wrong options represent, plus static GK context."
    }
  ],
  "mainsQuestions": [
    // 3 Mains answer writing questions (UPSC GS level) — one should relate to a new category (sports policy, cultural heritage, appointments and governance, etc.)
    {
      "num": "01",
      "paperTag": "GS-2 | 250 Words",
      "q": "Mains question text...",
      "hint": "Key angles: Point 1 → Point 2 → Point 3"
    }
  ],
  "summaryTable": [
    // 10 to 12 quick revision table rows — include rows for: important day, sports achievement, cultural event, appointment, book, heritage site
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
