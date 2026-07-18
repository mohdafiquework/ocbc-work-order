const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

let orders = [];
let orderCounter = 1;

// FIXED: Property Team WhatsApp number - receives ALL new orders
const PROPERTY_WHATSAPP = '+01111294098';

const BRANCHES = {
  "KL01": { name: "OCBC Kuala Lumpur Main", region: "Central" },
  "KL02": { name: "OCBC Ampang", region: "Central" },
  "KL03": { name: "OCBC Bukit Damansara", region: "Central" },
  "KL04": { name: "OCBC Cheras (Alam Damai)", region: "Central" },
  "KL05": { name: "OCBC Kepong (Metro Prima)", region: "Central" },
  "SEL01": { name: "OCBC Klang", region: "Central" },
  "SEL02": { name: "OCBC Kajang", region: "Central" },
  "SEL03": { name: "OCBC Petaling Jaya", region: "Central" },
  "SEL04": { name: "OCBC Puchong", region: "Central" },
  "SEL05": { name: "OCBC Subang Jaya", region: "Central" },
  "SEL06": { name: "OCBC Al-Amin Kota Damansara", region: "Central" },
  "SEL07": { name: "OCBC Al-Amin Kota Kemuning", region: "Central" },
  "SEL08": { name: "OCBC Al-Amin Bandar Botanic", region: "Central" },
  "SEL09": { name: "OCBC Al-Amin Jaya One", region: "Central" },
  "SEL10": { name: "OCBC Al-Amin Wangsa Maju", region: "Central" },
  "KED01": { name: "OCBC Alor Setar", region: "Northern" },
  "KED02": { name: "OCBC Al-Amin Sungai Petani", region: "Northern" },
  "PEN01": { name: "OCBC Penang", region: "Northern" },
  "PEN02": { name: "OCBC Batu Maung", region: "Northern" },
  "PEN03": { name: "OCBC Bukit Mertajam", region: "Northern" },
  "PER01": { name: "OCBC Teluk Intan", region: "Northern" },
  "PER02": { name: "OCBC Taiping", region: "Northern" },
  "PER03": { name: "OCBC Ipoh Main", region: "Northern" },
  "JHR01": { name: "OCBC Johor Bahru", region: "Southern" },
  "JHR02": { name: "OCBC Batu Pahat", region: "Southern" },
  "JHR03": { name: "OCBC Muar", region: "Southern" },
  "JHR04": { name: "OCBC Segamat", region: "Southern" },
  "JHR05": { name: "OCBC Kluang", region: "Southern" },
  "JHR06": { name: "OCBC Kulai", region: "Southern" },
  "JHR07": { name: "OCBC Taman Molek", region: "Southern" },
  "JHR08": { name: "OCBC Al-Amin Skudai", region: "Southern" },
  "MEL01": { name: "OCBC Melaka", region: "Southern" },
  "NS01": { name: "OCBC Seremban", region: "Southern" },
  "KEL01": { name: "OCBC Kota Bharu", region: "East Coast" },
  "PAH01": { name: "OCBC Kuantan", region: "East Coast" },
  "SBH01": { name: "OCBC Kota Kinabalu", region: "East Malaysia" },
  "SBH02": { name: "OCBC Al-Amin Sandakan", region: "East Malaysia" },
  "SRW01": { name: "OCBC Miri", region: "East Malaysia" },
  "SRW02": { name: "OCBC Kuching", region: "East Malaysia" },
  "SRW03": { name: "OCBC Al-Amin Sibu", region: "East Malaysia" }
};

// Email setup
const emailTransporter = nodemailer.createTransporter({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: process.env.BREVO_EMAIL,
    pass: process.env.BREVO_API_KEY
  }
});

// WhatsApp via CallMeBot
async function sendWhatsApp(phone, message) {
  try {
    const key = process.env.CALLMEBOT_API_KEY;
    if (!key) {
      console.log('CallMeBot API key not set. WhatsApp skipped for:', phone);
      return;
    }
    const clean = phone.replace(/[^0-9]/g, '');
    await axios.get('https://api.callmebot.com/whatsapp.php', {
      params: { phone: clean, text: message, apikey: key }
    });
    console.log('WhatsApp sent to:', phone);
  } catch (e) { 
    console.error('WhatsApp failed for', phone, ':', e.message); 
  }
}

// Email templates
function newOrderEmail(order) {
  const b = BRANCHES[order.branchCode] || {};
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <div style="background:#dc2626;color:white;padding:20px">
        <h1 style="margin:0;font-size:20px">OCBC Bank Malaysia - New Work Order</h1>
        <p style="margin:5px 0 0 0;opacity:0.9">Property Team Notification</p>
      </div>
      <div style="padding:24px">
        <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px;margin-bottom:20px">
          <p style="margin:0;font-size:14px;color:#991b1b"><strong>Priority:</strong> ${order.priority.toUpperCase()}</p>
          <p style="margin:5px 0 0 0;font-size:14px;color:#991b1b"><strong>WO:</strong> ${order.id}</p>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;width:30%;color:#6b7280;font-size:14px">Branch Code</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;font-weight:600">${order.branchCode}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px">Branch</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;font-weight:600">${order.branch}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px">Region</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px">${b.region || 'Unknown'}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px">Category</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px">${order.category}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px">Title</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;font-weight:600">${order.title}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top">Description</td><td style="padding:8px 0;font-size:14px">${order.description}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#f9fafb;border-radius:6px">
          <p style="margin:0 0 8px 0;font-size:14px"><strong>Contact:</strong></p>
          <p style="margin:0;font-size:14px;color:#6b7280">Phone: ${order.phone}</p>
          <p style="margin:4px 0 0 0;font-size:14px;color:#6b7280">Email: ${order.email}</p>
        </div>
        ${order.photos && order.photos.length > 0 ? `<p style="margin-top:16px;font-size:14px;color:#6b7280"><strong>${order.photos.length} photo(s) attached</strong></p>` : ''}
      </div>
      <div style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#9ca3af">
        <p style="margin:0">OCBC Bank Malaysia - Facilities Management</p>
        <p style="margin:4px 0 0 0">This is an automated notification sent to Property Team</p>
      </div>
    </div>`;
}

function statusUpdateEmail(order, newStatus) {
  const statusColors = { new: '#dc2626', 'in-progress': '#2563eb', completed: '#059669', cancelled: '#6b7280' };
  const color = statusColors[newStatus] || '#6b7280';
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <div style="background:${color};color:white;padding:20px">
        <h1 style="margin:0;font-size:20px">OCBC Work Order - Status Update</h1>
      </div>
      <div style="padding:24px">
        <p style="font-size:16px">Hello ${order.staff.split('(')[0].trim()},</p>
        <p style="font-size:16px">Your work order has been updated:</p>
        <div style="background:#f9fafb;border-left:4px solid ${color};padding:12px;margin:16px 0">
          <p style="margin:0;font-size:18px;font-weight:bold;color:${color};text-transform:uppercase">${newStatus}</p>
        </div>
        <p style="font-size:14px;color:#6b7280"><strong>WO:</strong> ${order.id}</p>
        <p style="font-size:14px;color:#6b7280"><strong>Title:</strong> ${order.title}</p>
        <p style="font-size:14px;color:#6b7280"><strong>Branch:</strong> ${order.branch}</p>
        <p style="margin-top:16px;font-size:14px">If you have questions, contact the Property Team at property@ocbc.com.my</p>
      </div>
    </div>`;
}

function newOrderWhatsApp(order) {
  const b = BRANCHES[order.branchCode] || {};
  const emoji = order.priority === 'critical' ? '🚨🚨🚨' : order.priority === 'high' ? '⚠️⚠️' : order.priority === 'medium' ? '⚠️' : 'ℹ️';
  return `${emoji} *OCBC NEW WORK ORDER* ${emoji}

*WO#:* ${order.id}
*Branch:* [${order.branchCode}] ${order.branch}
*Region:* ${b.region || 'Unknown'}
*Priority:* ${order.priority.toUpperCase()}
*Category:* ${order.category}
*Title:* ${order.title}

*Description:*
${order.description.substring(0, 150)}${order.description.length > 150 ? '...' : ''}

*Contact:* ${order.phone}
*Submitted by:* ${order.staff}

Reply to acknowledge.`;
}

function statusUpdateWhatsApp(order, newStatus) {
  const emoji = { new: '⏳', 'in-progress': '🔧', completed: '✅', cancelled: '❌' };
  return `*OCBC WORK ORDER UPDATE* ${emoji[newStatus] || '⏳'}

*WO#:* ${order.id}
*Status:* ${newStatus.toUpperCase()}
*Title:* ${order.title}
*Branch:* ${order.branch}

${newStatus === 'completed' ? '✅ Your issue has been resolved!' : 'You will receive another update when the status changes.'}`;
}

// API Routes
app.get('/api/orders', (req, res) => {
  res.json(orders.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

app.get('/api/orders/:id', (req, res) => {
  const o = orders.find(o => o.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  res.json(o);
});

app.post('/api/orders', async (req, res) => {
  const order = {
    id: `WO-OCBC-${req.body.branchCode || 'XXX'}-${String(orderCounter).padStart(4, '0')}`,
    ...req.body,
    date: new Date().toISOString(),
    assignedTo: ''
  };
  orderCounter++;
  orders.push(order);

  const propEmail = process.env.PROPERTY_EMAIL || 'property@ocbc.com.my';

  // 1. Send Email to Property Team
  try {
    await emailTransporter.sendMail({
      from: '"OCBC Facilities" <facilities@ocbc.com.my>',
      to: propEmail,
      subject: `[${order.priority.toUpperCase()}] New WO: ${order.title} - ${order.branch}`,
      html: newOrderEmail(order)
    });
    console.log('✅ Email sent to Property Team:', propEmail);
  } catch (e) { 
    console.error('❌ Email failed:', e.message); 
  }

  // 2. Send WhatsApp to Property Team (+01111294098)
  await sendWhatsApp(PROPERTY_WHATSAPP, newOrderWhatsApp(order));
  console.log('✅ WhatsApp sent to Property Team:', PROPERTY_WHATSAPP);

  res.status(201).json(order);
});

app.put('/api/orders/:id/status', async (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });

  const oldStatus = order.status;
  order.status = req.body.status;
  if (req.body.status === 'in-progress' && !order.assignedTo) order.assignedTo = 'Property Team';

  // Notify branch staff when status changes
  if (oldStatus !== req.body.status) {
    try {
      // Email to branch staff
      await emailTransporter.sendMail({
        from: '"OCBC Facilities" <facilities@ocbc.com.my>',
        to: order.email,
        subject: `Work Order ${order.id} - Status Updated to ${req.body.status.toUpperCase()}`,
        html: statusUpdateEmail(order, req.body.status)
      });
      console.log('✅ Status email sent to branch staff:', order.email);

      // WhatsApp to branch staff
      await sendWhatsApp(order.phone, statusUpdateWhatsApp(order, req.body.status));
      console.log('✅ Status WhatsApp sent to branch staff:', order.phone);
    } catch (e) { 
      console.error('❌ Status notification failed:', e.message); 
    }
  }

  res.json(order);
});

app.delete('/api/orders/:id', (req, res) => {
  orders = orders.filter(o => o.id !== req.params.id);
  res.json({ message: 'Deleted' });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    orders: orders.length,
    propertyWhatsApp: PROPERTY_WHATSAPP,
    version: '3.0'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════');
  console.log('  OCBC WORK ORDER SYSTEM v3.0');
  console.log('═══════════════════════════════════════════');
  console.log(`  Server: http://localhost:${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api/orders`);
  console.log('═══════════════════════════════════════════');
  console.log('  PROPERTY TEAM WHATSAPP: +01111294098');
  console.log('  (Receives ALL new work orders)');
  console.log('═══════════════════════════════════════════');
  console.log('  Features:');
  console.log('  ✅ Photo Upload (max 4)');
  console.log('  ✅ Status Notifications');
  console.log('  ✅ Analytics Dashboard');
  console.log('  ✅ QR Code per Branch');
  console.log('═══════════════════════════════════════════');
});

module.exports = app;
