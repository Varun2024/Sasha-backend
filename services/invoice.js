const PDFDocument = require('pdfkit');

function createInvoice(order) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // --- Invoice Content ---

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
        doc.moveDown();

        // Company & Customer Info
        doc.fontSize(12).font('Helvetica');
        doc.text(`Order ID: ${order.id}`);
        doc.text(`Order Date: ${new Date(order.createdAt.toDate()).toLocaleDateString()}`);
        doc.text(`Customer: ${order.address.fullName}`);
        doc.text(`Shipping to: ${order.address.address}, ${order.address.city}, ${order.address.zip}`);
        doc.moveDown(2);

        // Table Header
        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Item', 50, tableTop);
        doc.text('Qty', 280, tableTop, { width: 90, align: 'right' });
        doc.text('Price', 370, tableTop, { width: 90, align: 'right' });
        doc.text('Total', 0, tableTop, { align: 'right' });
        doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
        doc.font('Helvetica');
        doc.moveDown();

        // Table Rows (Order Items)
        order.items.forEach(item => {
            const rowY = doc.y;
            doc.text(item.name, 50, rowY);
            doc.text(item.quantity, 280, rowY, { width: 90, align: 'right' });
            doc.text(`₹${item.sale.toFixed(2)}`, 370, rowY, { width: 90, align: 'right' });
            doc.text(`₹${(item.sale * item.quantity).toFixed(2)}`, 0, rowY, { align: 'right' });
            doc.moveDown(1.5);
        });

        // Totals Section
        doc.moveTo(370, doc.y + 5).lineTo(550, doc.y + 5).stroke();
        doc.moveDown();
        doc.font('Helvetica-Bold');
        doc.text(`Subtotal: ₹${order.subtotal.toFixed(2)}`, 370, doc.y, { align: 'right', width: 180 });
        doc.moveDown();
        doc.text(`Shipping: ₹${order.shippingCost.toFixed(2)}`, 370, doc.y, { align: 'right', width: 180 });
        doc.moveDown();
        doc.text(`Total: ₹${order.total.toFixed(2)}`, 370, doc.y, { align: 'right', width: 180 });

        // --- End of Content ---
        doc.end();
    });
}

module.exports = { createInvoice };