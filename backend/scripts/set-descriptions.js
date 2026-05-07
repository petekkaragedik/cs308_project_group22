require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const UPDATES = [
  ['Top & Bottom Set',   "Your new situationship is this matching set. Crochet-crafted for the girl who shows up to the beach like it's a photoshoot."],
  ['Dress',              "The dress that makes everyone ask where you got it. Handcrafted crochet, main character energy, zero effort required."],
  ['Bikini Set',         "Not just a bikini, it's a whole moment. Handcrafted crochet that hits different when the sun does."],
  ['Fashion Necklace',   "The finishing touch that ties the whole fit together. Handcrafted and made to be noticed."],
  ['Bustier',            "Coastal girl meets fashion week. This crochet bustier is giving everything it needs to give."],
  ['Shirt',              "The kind of shirt you throw on and instantly look like you have your life together. Breezy, handcrafted, effortlessly cool."],
  ['Fashion Bracelet',   "Stack it, layer it, never take it off. Handcrafted and built for girls who accessorize like it's a personality."],
  ['Pareo',              "Beach to bar, no outfit change needed. Wrap it, tie it, make it yours."],
  ['Fashion Anklet',     "Low-key detail, high-key impact. The anklet that completes the whole beach fit."],
  ['Body Accessory',     "The piece nobody expects but everyone notices. Handcrafted and unapologetically unique."],
  ['Blouse',             "Effortless and a little ethereal. This crochet blouse is the summer energy you've been searching for."],
  ['Skirt',              "Flowy, handcrafted, and made for golden hour. The skirt that moves with you everywhere you go."],
  ['Shorts & Bermuda',   "Casual never looked this good. Crochet shorts that go from beach walk to rooftop without missing a beat."],
  ['Jacket',             "Layer up without losing the vibe. This crochet jacket is the transitional piece your summer wardrobe didn't know it needed."],
  ['Pants',              "Relaxed fit, elevated feel. Handcrafted summer pants that make doing nothing look intentional."],
  ['Bags',               "Carry less, look more. This handcrafted bag is the only plus-one your outfit needs."],
  ['Vest',               "The layering piece that does all the heavy lifting. Crochet, coastal, and completely effortless."],
  ['T-Shirt',            "The everyday essential, but make it handcrafted. Simple, breezy, and somehow always the right choice."],
  ['Scarf',              "Wear it a hundred ways, look incredible every time. Handcrafted and endlessly versatile."],
  ['Monokini',           "One piece, full statement. This crochet monokini is the swimwear edit your summer needed."],
  ['Bikini Top',         "Mix it, match it, own it. A handcrafted crochet top that works as hard as you do."],
];

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  let totalAffected = 0;

  for (const [category, description] of UPDATES) {
    const [result] = await db.query(
      'UPDATE products SET description = ? WHERE categoryName = ?',
      [description, category]
    );
    console.log(`${category}: ${result.affectedRows} rows updated`);
    totalAffected += result.affectedRows;
  }

  console.log(`\nTotal rows updated: ${totalAffected}`);
  await db.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
