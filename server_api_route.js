const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const CSV_PATH = path.join(__dirname, 'dataset', 'alternative_medicine.csv');

function parseCSV(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    // Split by comma but only 5 parts (chemical_composition may contain commas)
    const parts = line.split(',');
    const obj = {};
    // brand, name, chemical_composition (may be multi-word), price, form
    obj['brand'] = (parts[0] || '').trim();
    obj['name']  = (parts[1] || '').trim();
    // chemical_composition is everything between index 2 and last 2
    obj['chemical_composition'] = parts.slice(2, parts.length - 2).join(',').trim();
    obj['price'] = (parts[parts.length - 2] || '').trim();
    obj['form']  = (parts[parts.length - 1] || '').trim();
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

// GET /api/alternatives?med=aspirin
router.get('/alternatives', (req, res) => {
  const query = (req.query.med || '').trim().toLowerCase();
  if (!query) return res.json({ results: [] });

  const results = altData.filter(row =>
    row.brand.toLowerCase().includes(query) ||
    row.name.toLowerCase().includes(query) ||
    row.chemical_composition.toLowerCase().includes(query)
  ).sort((a, b) => parseFloat(a.price) - parseFloat(b.price)); // sort by price ascending

  res.json({ results });
});

module.exports = router;
