const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { protect } = require('../middleware/auth');

// Protected routes (student only)
router.post('/generate', protect, certificateController.generateCourseCertificate);
router.get('/my-certificates', protect, certificateController.getMyCertificates);
router.delete('/:courseId', protect, certificateController.deleteCertificate);

// Public route (anyone can verify)
router.get('/verify/:certificateId', certificateController.verifyCertificate);

module.exports = router;
