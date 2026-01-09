const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const User = require('../models/User');
const { generateCertificate } = require('../utils/certificateGenerator');
const { cloudinary } = require('../config/cloudinary');
const fs = require('fs');

/**
 * Generate certificate when student completes course
 */
exports.generateCourseCertificate = async (req, res) => {
  try {
    const { courseId } = req.body;
    const studentId = req.user.id;

    console.log('🎓 Certificate generation request:', { studentId, courseId });

    // Get course with enrolled students
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    console.log('📚 Course found:', {
      title: course.title,
      enrolledStudentsCount: course.enrolledStudents?.length || 0
    });

    // Check if student is enrolled in this course (from Course model)
    const isEnrolled = course.enrolledStudents?.some(enrollment => {
      const enrolledId = enrollment.studentId?.toString() || enrollment.toString();
      return enrolledId === studentId;
    });

    if (!isEnrolled) {
      console.log('❌ Student not enrolled. StudentId:', studentId);
      console.log('Course enrolled students:', course.enrolledStudents?.map(s => s.studentId || s));
      return res.status(404).json({ message: 'You are not enrolled in this course' });
    }

    console.log('✅ Student is enrolled in course');

    // Get user to check progress
    const user = await User.findById(studentId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('👤 User found:', {
      username: user.username,
      enrolledCoursesCount: user.enrolledCourses?.length || 0
    });

    // ✅ Check progress in user's enrolledCourses array
    let enrollment = null;
    let hasProgress = false;

    if (user.enrolledCourses && user.enrolledCourses.length > 0) {
      enrollment = user.enrolledCourses.find(e => {
        const enrolledCourseId = e.course?.toString() || e.course?._id?.toString();
        return enrolledCourseId === courseId;
      });

      if (enrollment) {
        hasProgress = true;
        console.log('📊 Progress found:', {
          progress: enrollment.progress,
          completedLessons: enrollment.completedLessons?.length || 0
        });
      }
    }

    // If no enrollment data found, check if progress tracking is enabled
    if (!hasProgress) {
      console.log('⚠️ No progress data found in User.enrolledCourses');
      console.log('Allowing certificate generation (progress tracking may not be enabled)');
    } else {
      // Check if course is 100% complete
      if (enrollment.progress < 100) {
        return res.status(400).json({
          message: `Complete all lessons to generate certificate. Current progress: ${enrollment.progress}%`
        });
      }
    }

    // Check if certificate already exists
    const existingCert = await Certificate.findOne({ student: studentId, course: courseId });
    if (existingCert) {
      console.log('ℹ️ Certificate already exists');
      return res.status(200).json({
        message: 'Certificate already generated',
        certificate: existingCert
      });
    }

    // Generate certificate ID
    const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    console.log('🆔 Generated certificateId:', certificateId);

    // Create certificate record
    const certificate = new Certificate({
      student: studentId,
      course: courseId,
      issueDate: new Date(),
      certificateId: certificateId
    });

    console.log('📋 Certificate object before save:', {
      student: certificate.student,
      course: certificate.course,
      certificateId: certificate.certificateId
    });

    // Get student name
    const studentName = user.profile?.firstName && user.profile?.lastName
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.username;

    console.log('👨‍🎓 Generating certificate for:', studentName);

    // Generate PDF
    const pdfPath = await generateCertificate({
      studentName,
      courseName: course.title,
      completionDate: enrollment?.completedAt || new Date(),
      certificateId: certificate.certificateId
    });

    console.log('📄 PDF generated at:', pdfPath);

    // ✅ Upload to Cloudinary (FINAL FIX - Use signed URL approach)
    const cloudinaryResult = await cloudinary.uploader.upload(pdfPath, {
      resource_type: 'image', // ✅ Use 'image' instead of 'raw' to avoid fl_attachment
      folder: 'certificates',
      public_id: certificateId,
      format: 'pdf',
      type: 'upload',
      access_mode: 'public',
      flags: 'attachment:false' // ✅ Prevent attachment mode
    });

    console.log('☁️ Uploaded to Cloudinary:', cloudinaryResult.secure_url);

    certificate.pdfUrl = cloudinaryResult.secure_url;
    await certificate.save();

    // Delete local file
    fs.unlinkSync(pdfPath);

    console.log('✅ Certificate saved to database');

    res.status(201).json({
      message: 'Certificate generated successfully',
      certificate
    });

  } catch (error) {
    console.error('❌ Certificate generation error:', error);
    res.status(500).json({
      message: 'Failed to generate certificate',
      error: error.message
    });
  }
};

/**
 * Get student's certificates
 */
exports.getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ student: req.user.id })
      .populate('course', 'title category')
      .sort({ issueDate: -1 });

    res.json({ certificates });
  } catch (error) {
    console.error('Failed to fetch certificates:', error);
    res.status(500).json({ message: 'Failed to fetch certificates' });
  }
};

/**
 * Verify certificate by ID (public route)
 */
exports.verifyCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.certificateId
    })
      .populate('student', 'firstName lastName username profile email')
      .populate('course', 'title');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // Get student name
    const student = certificate.student;
    const studentName = student.profile?.firstName && student.profile?.lastName
      ? `${student.profile.firstName} ${student.profile.lastName}`
      : student.firstName && student.lastName
        ? `${student.firstName} ${student.lastName}`
        : student.username;

    res.json({
      valid: true,
      certificate: {
        studentName,
        courseName: certificate.course.title,
        issueDate: certificate.issueDate,
        certificateId: certificate.certificateId
      }
    });
  } catch (error) {
    console.error('Verification failed:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
};

/**
 * Delete certificate by courseId (for regeneration)
 */
exports.deleteCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const result = await Certificate.findOneAndDelete({
      student: studentId,
      course: courseId
    });

    if (!result) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    console.log('🗑️ Certificate deleted:', result.certificateId);
    res.json({ message: 'Certificate deleted successfully. You can now regenerate it.' });
  } catch (error) {
    console.error('Delete certificate failed:', error);
    res.status(500).json({ message: 'Failed to delete certificate' });
  }
};
