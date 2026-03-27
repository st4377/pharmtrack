const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const CSV_PATH = path.join(__dirname, 'dataset', 'alternative_medicine.csv');

// ── CLEAN CSV PARSER ──
// Handles Windows \r\n line endings, trims all whitespace
function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.replace(/\r/g, '').trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  return lines.slice(1)
    .filter(line => line.trim())           // skip blank lines
    .map(line => {
      const parts = line.split(',').map(p => p.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = parts[i] || ''; });
      return obj;
    });
}

let altData = [];
try {
  altData = parseCSV(CSV_PATH);
  console.log(`✅ Loaded ${altData.length} rows from alternative_medicine.csv`);
} catch (err) {
  console.error('❌ Could not load alternative_medicine.csv:', err.message);
}

// ── SMART SEARCH LOGIC ──
// Step 1: Find all rows that directly match brand, name, or chemical composition
// Step 2: Extract the chemical compositions from those matches
// Step 3: Return ALL medicines that share the same chemical composition (alternatives)
// This way searching "crocin" also returns "paracetamol", "calpol", "dolo" etc.



// ══════════════════════════════════════════════════════════════
//  COSINE SIMILARITY — ALTERNATIVE MEDICINE SUGGESTER
// ══════════════════════════════════════════════════════════════

// ── HELPERS ──

/** Lowercase, strip punctuation, split into tokens */
function tokenize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
}

/** Build a term-frequency vector over a fixed vocab */
function buildVector(tokens, vocab) {
  const vec = new Array(vocab.length).fill(0);
  tokens.forEach(t => {
    const i = vocab.indexOf(t);
    if (i !== -1) vec[i]++;
  });
  return vec;
}

/** Cosine similarity between two equal-length arrays */
function cosineSim(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return (magA && magB) ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

// ── PRE-BUILD VOCAB & ROW VECTORS (done once at startup) ──
// Each row is represented by its chemical_composition + name + form tokens
const allTokens = altData.flatMap(row =>
  tokenize(`${row.chemical_composition} ${row.name} ${row.form}`)
);
const vocab = [...new Set(allTokens)];   // unique vocabulary

const rowVectors = altData.map(row =>
  buildVector(
    tokenize(`${row.chemical_composition} ${row.name} ${row.form}`),
    vocab
  )
);

console.log(`✅ Cosine vocab size: ${vocab.length} tokens across ${altData.length} medicines`);

// ── COSINE SIMILARITY ROUTE ──
// GET /api/cosine-alternatives?med=paracetamol
// Returns top-10 most similar medicines ranked by cosine score, then price
router.get('/cosine-alternatives', (req, res) => {
  const query = (req.query.med || '').trim();
  if (!query) return res.json({ results: [] });

  // 1st attempt: cosine similarity as usual
  let queryVec = buildVector(tokenize(query), vocab);
  let scored = altData
    .map((row, i) => ({
      ...row,
      score: cosineSim(queryVec, rowVectors[i])
    }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || parseFloat(a.price) - parseFloat(b.price))
    .slice(0, 10);

  // If no results, try to map brand/name to generic name and retry
  if (scored.length === 0) {
    // Find a row where brand or name matches the query (case-insensitive, substring)
    const match = altData.find(row =>
      (row.brand && row.brand.toLowerCase().includes(query.toLowerCase())) ||
      (row.name && row.name.toLowerCase().includes(query.toLowerCase()))
    );
    if (match && match.name) {
      // Use the generic name as the new query for cosine similarity
      const generic = match.name.trim();
      const genericVec = buildVector(tokenize(generic), vocab);
      // Only return results with the same generic name
      scored = altData
        .map((row, i) => ({
          ...row,
          score: cosineSim(genericVec, rowVectors[i])
        }))
        .filter(r => r.score > 0 && r.name && r.name.toLowerCase() === generic.toLowerCase())
        .sort((a, b) => b.score - a.score || parseFloat(a.price) - parseFloat(b.price))
        .slice(0, 10);
    }
  }

  res.json({ results: scored });
});

module.exports = router;