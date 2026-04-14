const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

router.post('/upload', (req, res) => {
  const upload = req.app.locals.upload;

  upload.single('prescription')(req, res, async (err) => {
    if (err) return res.json({ success: false, error: err.message });

    try {
      const file = req.file;
      const { email, notes } = req.body;

      if (!file) return res.json({ success: false, error: 'No file received' });

      const ext = file.originalname.split('.').pop();
      const fileName = `${(email || 'anon').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${ext}`;

      // 1. Upload file to Supabase Storage
      const { error: storageError } = await supabase
        .storage
        .from('prescriptions')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (storageError) {
        console.error('Storage error:', storageError);
        return res.json({ success: false, error: storageError.message });
      }

      // 2. Get public URL
      const { data: urlData } = supabase
        .storage
        .from('prescriptions')
        .getPublicUrl(fileName);

      const fileUrl = urlData.publicUrl;

      // 3. Save metadata to DB
      const { error: dbError } = await supabase
        .from('prescriptions')
        .insert([{
          file_name: fileName,
          file_url: fileUrl,
          notes: notes || '',
          uploaded_at: new Date().toISOString()
        }]);

      if (dbError) {
        console.error('DB error:', dbError);
        return res.json({ success: false, error: dbError.message });
      }

      res.json({
        success: true,
        fileName,
        fileUrl,
        uploadedAt: new Date().toISOString()
      });

    } catch (e) {
      console.error('Upload error:', e);
      res.json({ success: false, error: 'Server error' });
    }
  });
});

module.exports = router;