const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateCertificate(data) {
  return new Promise((resolve, reject) => {
    try {
      const { studentName, courseName, completionDate, certificateId } = data;
      
      const certDir = path.join(__dirname, '../certificates');
      if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
      }
      
      const fileName = `certificate_${certificateId}.pdf`;
      const filePath = path.join(certDir, fileName);
      
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Border
      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
         .lineWidth(2)
         .strokeColor('#4F46E5')
         .stroke();
      
      // Title
      doc.fontSize(40)
         .fillColor('#4F46E5')
         .font('Helvetica-Bold')
         .text('Certificate of Completion', 0, 120, { align: 'center' });
      
      // Student Name
      doc.fontSize(30)
         .fillColor('#1F2937')
         .text(studentName, 0, 200, { align: 'center' });
      
      // Description
      doc.fontSize(16)
         .fillColor('#6B7280')
         .font('Helvetica')
         .text('has successfully completed', 0, 260, { align: 'center' });
      
      // Course Name
      doc.fontSize(24)
         .fillColor('#4F46E5')
         .font('Helvetica-Bold')
         .text(courseName, 0, 300, { align: 'center' });
      
      // Date
      doc.fontSize(14)
         .fillColor('#6B7280')
         .font('Helvetica')
         .text(`Completed on: ${new Date(completionDate).toLocaleDateString()}`, 0, 360, { align: 'center' });
      
      // Certificate ID
      doc.fontSize(10)
         .fillColor('#9CA3AF')
         .text(`Certificate ID: ${certificateId}`, 0, doc.page.height - 80, { align: 'center' });
      
      doc.end();
      
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateCertificate };
