import nodemailer from 'nodemailer';
import { template } from '../utils/emailTemplate.js';
let tx;
const transport = () => {
  if (!process.env.SMTP_HOST) return null;
  return (tx ||= nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }));
};
export async function sendEmail(to, subject, title, lines) {
  const t = transport();
  if (!t) return console.log('SMTP not configured; email skipped');
  await t.sendMail({ from: process.env.SMTP_USER, to, subject, html: template(title, lines) });
}
