const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const HOSPITALS_PATH = path.join(__dirname, '../emergency/hospitals.json');

// GET all hospitals
router.get('/', (req, res) => {
  fs.readFile(HOSPITALS_PATH, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read hospitals file.' });
    res.json(JSON.parse(data));
  });
});

// ADD a hospital
router.post('/', (req, res) => {
  const newHospital = req.body;
  fs.readFile(HOSPITALS_PATH, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read hospitals file.' });
    let hospitals = JSON.parse(data);
    newHospital.id = Date.now();
    hospitals.push(newHospital);
    fs.writeFile(HOSPITALS_PATH, JSON.stringify(hospitals, null, 2), err => {
      if (err) return res.status(500).json({ error: 'Failed to save hospital.' });
      res.json(newHospital);
    });
  });
});

// UPDATE a hospital
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const updated = req.body;
  fs.readFile(HOSPITALS_PATH, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read hospitals file.' });
    let hospitals = JSON.parse(data);
    const idx = hospitals.findIndex(h => h.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Hospital not found.' });
    hospitals[idx] = { ...hospitals[idx], ...updated, id };
    fs.writeFile(HOSPITALS_PATH, JSON.stringify(hospitals, null, 2), err => {
      if (err) return res.status(500).json({ error: 'Failed to update hospital.' });
      res.json(hospitals[idx]);
    });
  });
});

// DELETE a hospital
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  fs.readFile(HOSPITALS_PATH, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read hospitals file.' });
    let hospitals = JSON.parse(data);
    const idx = hospitals.findIndex(h => h.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Hospital not found.' });
    const removed = hospitals.splice(idx, 1)[0];
    fs.writeFile(HOSPITALS_PATH, JSON.stringify(hospitals, null, 2), err => {
      if (err) return res.status(500).json({ error: 'Failed to delete hospital.' });
      res.json(removed);
    });
  });
});

module.exports = router;
