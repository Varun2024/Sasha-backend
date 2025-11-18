const nodemailer = require('nodemailer');
// Configure your email transporter
// IMPORTANT: Use environment variables for your credentials!
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // e.g., 'smtp.sendgrid.net'
    port: process.env.EMAIL_PORT, // e.g., 587
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER, // e.g., 'apikey' for SendGrid
        pass: process.env.EMAIL_PASS, // Your SendGrid API Key or email password
    },
});

async function sendInvoiceEmail(customerEmail, pdfBuffer, orderId) {
    const mailOptions = {
        from: '"Your Store Name" <no-reply@yourstore.com>',
        to: customerEmail,
        subject: `Your Order Confirmation & Invoice (ID: ${orderId})`,
        html: `
            <h1>Thank you for your order!</h1>
            <p>We've received your order and are getting it ready for you.</p>
            <p>Your invoice is attached to this email.</p>
            <p>Order ID: ${orderId}</p>
        `,
        attachments: [
            {
                filename: `invoice-${orderId}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ],
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Invoice email sent successfully.');
    } catch (error) {
        console.error('Error sending invoice email:', error);
        // You might want to add retry logic or log this error for follow-up
    }
}

module.exports = { sendInvoiceEmail };