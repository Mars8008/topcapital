// Emails the site owner when a new contact / quote message arrives.
// Configured via SMTP_USER + SMTP_PASS (a Gmail address + its 16-letter App Password).
// If they are not set, notifications are skipped and messages still land in the admin inbox.
const nodemailer = require('nodemailer');
const config = require('./config');

let transporter = null;
function getTransporter() {
    if (!config.smtp.user || !config.smtp.pass) return null;
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.port === 465,
            auth: { user: config.smtp.user, pass: config.smtp.pass },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000,
        });
    }
    return transporter;
}

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LABELS = {
    company: 'Компани', project_description: 'Төслийн тайлбар', project_type: 'Төслийн төрөл',
    property_size: 'Талбайн хэмжээ', budget: 'Төсөв', timeline: 'Хугацаа', style: 'Загвар',
    start_date: 'Эхлэх огноо', address: 'Хаяг', requirements: 'Нэмэлт шаардлага',
};

async function notifyNewMessage(msg, siteUrl) {
    const t = getTransporter();
    if (!t) return;
    const to = config.smtp.notifyTo || config.smtp.user;
    const kind = msg.type === 'quote' ? 'Үнийн санал хүсэлт' : 'Холбоо барих';

    const rows = [
        ['Нэр', msg.name], ['Имэйл', msg.email], ['Утас', msg.phone],
        ...Object.entries(msg.details || {}).map(([k, v]) => [LABELS[k] || k, v]),
    ].filter(([, v]) => v);

    const text = [
        `Шинэ мессеж (${kind})`, '',
        ...rows.map(([k, v]) => `${k}: ${v}`), '',
        msg.message || '', '',
        `Админ: ${siteUrl}/admin/`,
    ].join('\n');

    const html = `
<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:600px">
  <h2 style="margin:0 0 12px">Шинэ мессеж — ${escapeHtml(kind)}</h2>
  <table style="border-collapse:collapse">
    ${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`).join('')}
  </table>
  ${msg.message ? `<p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px">${escapeHtml(msg.message)}</p>` : ''}
  <p style="color:#666">Энэ имэйлд «Reply» дарвал шууд ${escapeHtml(msg.name)} руу хариу очно.<br>
  <a href="${escapeHtml(siteUrl)}/admin/">Админ самбар нээх</a></p>
</div>`;

    await t.sendMail({
        from: `"TOP CAPITAL вэбсайт" <${config.smtp.user}>`,
        to,
        replyTo: { name: msg.name, address: msg.email },
        subject: `Шинэ ${kind.toLowerCase()}: ${msg.name}`.replace(/[\r\n]+/g, ' ').slice(0, 150),
        text,
        html,
    });
}

module.exports = { notifyNewMessage };
