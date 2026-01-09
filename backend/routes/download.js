const express = require('express');
const router = express.Router();
const axios = require('axios');
const Lesson = require('../models/Lesson');
const { catchAsync, AppError } = require('../middleware/errorHandler');

// ===========================
// DOWNLOAD ATTACHMENT
// ===========================
router.get('/lessons/:lessonId/attachments/:attachmentId', catchAsync(async (req, res, next) => {
  const { lessonId, attachmentId } = req.params;

  // Find the lesson
  const lesson = await Lesson.findById(lessonId);
  
  if (!lesson) {
    return next(new AppError('Lesson not found', 404));
  }

  // Find the attachment
  const attachment = lesson.attachments.id(attachmentId);
  
  if (!attachment) {
    return next(new AppError('Attachment not found', 404));
  }

  try {
    // ✅ Fetch file from Cloudinary
    const response = await axios({
      method: 'GET',
      url: attachment.url,
      responseType: 'stream'
    });

    // ✅ Set proper headers
    res.setHeader('Content-Type', attachment.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
    res.setHeader('Content-Length', attachment.size);

    // ✅ Pipe the stream
    response.data.pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    return next(new AppError('Failed to download file', 500));
  }
}));

module.exports = router;
