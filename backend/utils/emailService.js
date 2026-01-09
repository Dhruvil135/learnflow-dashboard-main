const nodemailer = require('nodemailer');

/**
 * Email Service for SkillForge LMS
 * Uses Gmail SMTP with App Password
 */

// Create transporter (reusable)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send Password Reset Email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name for personalization
 */
exports.sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
  const transporter = createTransporter();

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  const mailOptions = {
    from: `"SkillForge LMS" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Reset Your SkillForge Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎓 SkillForge</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Learning Management System</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px;">Password Reset Request</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px;">
              Hi <strong>${userName}</strong>,
            </p>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reset My Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
              This link will expire in <strong>1 hour</strong> for security reasons.
            </p>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 10px;">
              If you didn't request this, you can safely ignore this email.
            </p>
            
            <!-- Fallback URL -->
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px;">
                If the button doesn't work, copy and paste this link:
              </p>
              <p style="color: #6366f1; font-size: 12px; word-break: break-all; margin: 0;">
                ${resetUrl}
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © 2024 SkillForge LMS. All rights reserved.
            </p>
          </div>
          
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw new Error('Failed to send email. Please try again later.');
  }
};

/**
 * Send Password Changed Confirmation Email
 */
exports.sendPasswordChangedEmail = async (email, userName = 'User') => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"SkillForge LMS" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '✅ Your SkillForge Password Has Been Changed',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎓 SkillForge</h1>
          </div>
          
          <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px;">Password Changed Successfully ✅</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Hi <strong>${userName}</strong>,
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Your password has been successfully changed. You can now login with your new password.
            </p>
            
            <p style="color: #ef4444; font-size: 14px; line-height: 1.6; margin-top: 20px;">
              If you didn't make this change, please contact support immediately!
            </p>
          </div>
          
          <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 SkillForge LMS</p>
          </div>
          
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password changed confirmation sent to: ${email}`);
  } catch (error) {
    console.error('❌ Confirmation email failed:', error.message);
    // Don't throw - this is just a confirmation
  }
};
