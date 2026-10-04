import PDFDocument from 'pdfkit';
export function streamInvoice(order, user, res) {
  const no = `INV-${String(order._id).slice(-8).toUpperCase()}`;
  const amt = `${(order.amountMinor / 100).toFixed(2)} ${order.currency}`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${no}.pdf"`);
  const d = new PDFDocument({ margin: 50 }); d.pipe(res);
  d.fontSize(22).text('Invoice / Receipt').moveDown();
  d.fontSize(11);
  [['Invoice number', no], ['Student', user.name], ['Email', user.email], ['Course', order.course?.title || 'Course'],
   ['Payment provider', order.provider], ['Transaction ID', order.providerTransactionId || '-'],
   ['Amount', amt], ['Payment date', (order.completedAt || order.createdAt).toISOString().slice(0, 10)],
   ['Status', order.status]].forEach(([k, v]) => d.text(`${k}: ${v}`).moveDown(0.3));
  d.end();
}
