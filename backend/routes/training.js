/**
 * Training Videos & SOP Routes Module
 * 
 * Handles role-segregated training videos for Admin, Staff, and Travel Associate Partners.
 * Enforces strict role isolation:
 * - Admin: Manages all videos (CRUD), views all roles
 * - Staff: Only views videos tagged for 'staff' or 'all'
 * - Travel Associate (Partner): Only views videos tagged for 'partner' or 'all'
 */

import { authMiddleware } from '../middleware/index.js';

export function extractYouTubeId(url) {
  if (!url) return '';
  const trimmed = url.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }
  // Fallback if user just entered the 11-char ID directly
  if (trimmed.length === 11 && !trimmed.includes('/')) {
    return trimmed;
  }
  return trimmed;
}

export function createTrainingRoutes(app, pool) {

  // ─── GET /api/training-videos ───
  // Role-filtered fetching of training videos
  app.get('/api/training-videos', async (req, res) => {
    try {
      const { role = 'all', category, user_id, user_type } = req.query;
      
      let query = 'SELECT * FROM training_videos';
      const params = [];
      const conditions = [];

      if (role === 'staff') {
        conditions.push("(target_audience = 'staff' OR target_audience = 'all')");
        conditions.push("is_published = 1");
      } else if (role === 'partner') {
        conditions.push("(target_audience = 'partner' OR target_audience = 'all')");
        conditions.push("is_published = 1");
      } else if (role !== 'admin') {
        // Default public/general fallback if non-admin role
        conditions.push("is_published = 1");
      }

      if (category && category !== 'All') {
        conditions.push('category = ?');
        params.push(category);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY is_featured DESC, display_order ASC, created_at DESC';

      const [rows] = await pool.query(query, params);

      // If user progress query parameters provided, attach completed state
      if (user_id && user_type) {
        const [views] = await pool.query(
          'SELECT video_id FROM training_video_views WHERE user_identifier = ? AND user_type = ?',
          [String(user_id), String(user_type)]
        );
        const completedVideoIds = new Set(views.map(v => String(v.video_id)));
        
        const rowsWithStatus = rows.map(v => ({
          ...v,
          isCompleted: completedVideoIds.has(String(v.id))
        }));

        return res.json(rowsWithStatus);
      }

      res.json(rows);
    } catch (err) {
      console.error('Error fetching training videos:', err);
      res.status(500).json({ error: 'Failed to fetch training videos' });
    }
  });

  // ─── POST /api/training-videos ───
  // Add new training video (Admin)
  app.post('/api/training-videos', async (req, res) => {
    try {
      const {
        title,
        description = '',
        youtubeUrl,
        category = 'General',
        targetAudience = 'all',
        duration = '00:00',
        pdfAttachmentUrl = '',
        displayOrder = 0,
        isFeatured = false,
        isPublished = true
      } = req.body || {};

      if (!title || !youtubeUrl) {
        return res.status(400).json({ error: 'Title and YouTube URL are required' });
      }

      const youtubeId = extractYouTubeId(youtubeUrl);
      if (!youtubeId) {
        return res.status(400).json({ error: 'Invalid YouTube URL provided' });
      }

      const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

      const [result] = await pool.query(
        `INSERT INTO training_videos 
        (title, description, youtube_url, youtube_id, category, target_audience, thumbnail_url, duration, pdf_attachment_url, display_order, is_featured, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          description,
          youtubeUrl,
          youtubeId,
          category,
          targetAudience,
          thumbnailUrl,
          duration,
          pdfAttachmentUrl,
          Number(displayOrder) || 0,
          isFeatured ? 1 : 0,
          isPublished ? 1 : 0
        ]
      );

      const [created] = await pool.query('SELECT * FROM training_videos WHERE id = ?', [result.insertId]);
      res.status(201).json(created[0]);
    } catch (err) {
      console.error('Error creating training video:', err);
      res.status(500).json({ error: 'Failed to create training video' });
    }
  });

  // ─── PUT /api/training-videos/:id ───
  // Update video details (Admin)
  app.put('/api/training-videos/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        youtubeUrl,
        category,
        targetAudience,
        duration,
        pdfAttachmentUrl,
        displayOrder,
        isFeatured,
        isPublished
      } = req.body || {};

      let youtubeId = undefined;
      let thumbnailUrl = undefined;

      if (youtubeUrl) {
        youtubeId = extractYouTubeId(youtubeUrl);
        if (youtubeId) {
          thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        }
      }

      const updates = [];
      const params = [];

      if (title !== undefined) { updates.push('title = ?'); params.push(title); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description); }
      if (youtubeUrl !== undefined) { updates.push('youtube_url = ?'); params.push(youtubeUrl); }
      if (youtubeId) { updates.push('youtube_id = ?'); params.push(youtubeId); }
      if (thumbnailUrl) { updates.push('thumbnail_url = ?'); params.push(thumbnailUrl); }
      if (category !== undefined) { updates.push('category = ?'); params.push(category); }
      if (targetAudience !== undefined) { updates.push('target_audience = ?'); params.push(targetAudience); }
      if (duration !== undefined) { updates.push('duration = ?'); params.push(duration); }
      if (pdfAttachmentUrl !== undefined) { updates.push('pdf_attachment_url = ?'); params.push(pdfAttachmentUrl); }
      if (displayOrder !== undefined) { updates.push('display_order = ?'); params.push(Number(displayOrder) || 0); }
      if (isFeatured !== undefined) { updates.push('is_featured = ?'); params.push(isFeatured ? 1 : 0); }
      if (isPublished !== undefined) { updates.push('is_published = ?'); params.push(isPublished ? 1 : 0); }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields provided for update' });
      }

      params.push(id);
      await pool.query(`UPDATE training_videos SET ${updates.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM training_videos WHERE id = ?', [id]);
      res.json(updated[0]);
    } catch (err) {
      console.error('Error updating training video:', err);
      res.status(500).json({ error: 'Failed to update training video' });
    }
  });

  // ─── DELETE /api/training-videos/:id ───
  // Delete training video (Admin)
  app.delete('/api/training-videos/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM training_videos WHERE id = ?', [id]);
      res.json({ message: 'Training video deleted successfully' });
    } catch (err) {
      console.error('Error deleting training video:', err);
      res.status(500).json({ error: 'Failed to delete training video' });
    }
  });

  // ─── POST /api/training-videos/:id/complete ───
  // Mark video as watched/completed for progress tracking
  app.post('/api/training-videos/:id/complete', async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id, user_type } = req.body || {};

      if (!user_id || !user_type) {
        return res.status(400).json({ error: 'user_id and user_type are required' });
      }

      await pool.query(
        `INSERT INTO training_video_views (video_id, user_identifier, user_type)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE completed_at = CURRENT_TIMESTAMP`,
        [id, String(user_id), String(user_type)]
      );

      res.json({ message: 'Progress recorded' });
    } catch (err) {
      console.error('Error recording video completion:', err);
      res.status(500).json({ error: 'Failed to record completion' });
    }
  });
}
