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

router.get('/alternatives', (req, res) => {
  const query = (req.query.med || '').trim().toLowerCase();
  if (!query) return res.json({ results: [] });

  // Step 1: Find direct matches
  const directMatches = altData.filter(row =>
    row.brand.toLowerCase().includes(query) ||
    row.name.toLowerCase().includes(query) ||
    row.chemical_composition.toLowerCase().includes(query)
  );

  if (directMatches.length === 0) {
    return res.json({ results: [] });
  }

  // Step 2: Collect unique chemical compositions from direct matches
  // Use the base active ingredient (first word of chemical_composition)
  // e.g. "Paracetamol 500mg" → "paracetamol"
  const chemKeywords = new Set();
  directMatches.forEach(row => {
    const baseIngredient = row.chemical_composition.toLowerCase().split(' ')[0];
    if (baseIngredient) chemKeywords.add(baseIngredient);
  });

  // Step 3: Return ALL rows that share the same active ingredient
  const results = altData.filter(row => {
    const baseIngredient = row.chemical_composition.toLowerCase().split(' ')[0];
    return chemKeywords.has(baseIngredient);
  }).sort((a, b) => parseFloat(a.price) - parseFloat(b.price)); // cheapest first

  res.json({ results });
});

module.exports = router;
