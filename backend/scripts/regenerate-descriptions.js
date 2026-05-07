require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const CHECKPOINT_FILE = path.join(__dirname, '.regen-checkpoint.json');
const DELAY_MS = 300;
const RETRY_DELAYS = [15000, 30000, 60000]; // backoff steps for 429

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadCheckpoint() {
  try {
    return new Set(JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8')));
  } catch {
    return new Set();
  }
}

function saveCheckpoint(done) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify([...done]));
}

async function generateDescription(name, category, attempt = 0) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a Gen Z social media copywriter for Scylla, a trendy handcrafted beach and summer crochet clothing brand. Write a product description that is 2-3 sentences max, fashionable, and uses current Gen Z/social media marketing language. Feel like something you'd read on a brand's Instagram. No hashtags. No emojis. Just vibes.\n\nProduct name: ${name}\nCategory: ${category}`
          }]
        }]
      })
    }
  );

  const data = await response.json();

  if (response.status === 429) {
    if (data.error?.details) {
      const daily = data.error.details.find(
        (d) => d.quotaId?.includes('PerDay') || JSON.stringify(d).includes('PerDay')
      );
      if (daily) {
        console.error('\nDaily quota exhausted. Run the script again tomorrow — it will resume from where it left off.');
        process.exit(1);
      }
    }
    if (attempt >= RETRY_DELAYS.length) {
      throw new Error(`Rate limited after ${attempt} retries.`);
    }
    const wait = RETRY_DELAYS[attempt];
    console.log(`  Rate limited. Waiting ${wait / 1000}s before retry ${attempt + 1}…`);
    await sleep(wait);
    return generateDescription(name, category, attempt + 1);
  }

  if (!response.ok || !data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error(`Gemini error: ${JSON.stringify(data)}`);
  }

  return data.candidates[0].content.parts[0].text.trim();
}

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await db.query(
    `SELECT model, name, categoryName
     FROM products
     GROUP BY model, name, categoryName
     ORDER BY model`
  );

  const done = loadCheckpoint();
  const pending = rows.filter((r) => !done.has(r.model));

  console.log(`Found ${rows.length} models total. ${done.size} already done. Processing ${pending.length} remaining.\n`);

  for (const row of pending) {
    const description = await generateDescription(row.name, row.categoryName || 'Fashion');
    await db.query('UPDATE products SET description = ? WHERE model = ?', [description, row.model]);
    done.add(row.model);
    saveCheckpoint(done);
    console.log(`Updated: ${row.name}`);
    await sleep(DELAY_MS);
  }

  console.log('\nDone.');
  if (done.size === rows.length) {
    fs.rmSync(CHECKPOINT_FILE, { force: true });
    console.log('Checkpoint cleared.');
  }

  await db.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
