import { Resend } from 'resend'
import { format } from 'date-fns'
import { formatCurrency, shortCode } from './utils'

const resend = new Resend(process.env.RESEND_API_KEY)

interface ConfirmationData {
  customerName: string
  customerEmail: string
  bookingCode: string
  date: string
  startTime: string
  endTime: string
  pax: number
  totalPrice: number
  qrCodeDataUrl: string
}

export async function sendBookingConfirmation(data: ConfirmationData) {
  const formattedDate = format(new Date(data.date), 'EEEE, MMMM d, yyyy')
  const code = shortCode(data.bookingCode)

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:36px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:26px;letter-spacing:3px;font-weight:900;">ANTIGRAVITY</h1>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:11px;letter-spacing:4px;text-transform:uppercase;">Sauna &amp; Cold Plunge</p>
  </div>

  <!-- Status banner -->
  <div style="background:#00c896;padding:14px;text-align:center;">
    <p style="color:#fff;margin:0;font-size:17px;font-weight:700;letter-spacing:.5px;">✓ Booking Confirmed</p>
  </div>

  <!-- Body -->
  <div style="padding:32px;">
    <p style="color:#374151;margin:0 0 6px;">Hi <strong>${data.customerName}</strong>,</p>
    <p style="color:#6b7280;margin:0 0 28px;font-size:14px;">Your session is booked! Please show the QR code at check-in.</p>

    <!-- Details card -->
    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="color:#9ca3af;font-size:13px;padding:7px 0;border-bottom:1px solid #e5e7eb;">Booking Code</td>
            <td align="right" style="color:#111827;font-weight:700;font-family:monospace;padding:7px 0;border-bottom:1px solid #e5e7eb;">${code}</td></tr>
        <tr><td style="color:#9ca3af;font-size:13px;padding:7px 0;border-bottom:1px solid #e5e7eb;">Date</td>
            <td align="right" style="color:#111827;font-weight:600;padding:7px 0;border-bottom:1px solid #e5e7eb;">${formattedDate}</td></tr>
        <tr><td style="color:#9ca3af;font-size:13px;padding:7px 0;border-bottom:1px solid #e5e7eb;">Time</td>
            <td align="right" style="color:#111827;font-weight:600;padding:7px 0;border-bottom:1px solid #e5e7eb;">${data.startTime} – ${data.endTime}</td></tr>
        <tr><td style="color:#9ca3af;font-size:13px;padding:7px 0;border-bottom:1px solid #e5e7eb;">Guests</td>
            <td align="right" style="color:#111827;font-weight:600;padding:7px 0;border-bottom:1px solid #e5e7eb;">${data.pax} ${data.pax === 1 ? 'person' : 'people'}</td></tr>
        <tr><td style="color:#9ca3af;font-size:13px;padding:7px 0;">Total Paid</td>
            <td align="right" style="color:#00c896;font-weight:700;font-size:18px;padding:7px 0;">${formatCurrency(data.totalPrice)}</td></tr>
      </table>
    </div>

    <!-- QR Code -->
    <div style="text-align:center;margin-bottom:28px;">
      <p style="color:#6b7280;font-size:13px;margin:0 0 12px;">Show this at the entrance</p>
      <img src="${data.qrCodeDataUrl}" alt="QR Code"
           style="width:200px;height:200px;border-radius:12px;border:6px solid #f3f4f6;box-shadow:0 2px 12px rgba(0,0,0,.1);" />
    </div>

    <!-- Notes -->
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:14px 16px;">
      <p style="color:#92400e;font-size:13px;margin:0;font-weight:600;">Before your visit:</p>
      <ul style="color:#92400e;font-size:13px;margin:8px 0 0;padding-left:18px;line-height:1.7;">
        <li>Arrive 10 minutes before your session</li>
        <li>Bring a towel — changing rooms available</li>
        <li>This booking is non-transferable and non-refundable</li>
      </ul>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#1a1a2e;padding:20px;text-align:center;">
    <p style="color:#6b7280;font-size:12px;margin:0;">Questions? <a href="mailto:support@antigravity.id" style="color:#94a3b8;">support@antigravity.id</a></p>
    <p style="color:#374151;font-size:11px;margin:6px 0 0;">© ${new Date().getFullYear()} Antigravity. All rights reserved.</p>
  </div>

</div>
</body>
</html>`

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: data.customerEmail,
    subject: `Booking Confirmed – ${formattedDate} at ${data.startTime} [${code}]`,
    html,
  })
}

export async function sendCancellationEmail(data: {
  customerName: string
  customerEmail: string
  bookingCode: string
  date: string
  startTime: string
  reason?: string
}) {
  const formattedDate = format(new Date(data.date), 'EEEE, MMMM d, yyyy')

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: data.customerEmail,
    subject: `Booking Cancelled – ${shortCode(data.bookingCode)}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
      <h2 style="color:#1a1a2e;">Booking Cancelled</h2>
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Your booking for <strong>${formattedDate} at ${data.startTime}</strong> has been cancelled.</p>
      ${data.reason ? `<p style="color:#6b7280;">Reason: ${data.reason}</p>` : ''}
      <p>If you believe this is an error, please contact <a href="mailto:support@antigravity.id">support@antigravity.id</a>.</p>
    </div>`,
  })
}
