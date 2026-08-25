import nodemailer from 'nodemailer';
import { Order } from '../src/types';

/**
 * Production-ready email service for Seller/Admin Order Notifications.
 * If SMTP credentials are not yet supplied in the environment (.env),
 * it logs the full email message payload for audit and returns success.
 */

export interface SendOrderEmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getEmailTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    try {
      if (!transporter) {
        transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          tls: {
            rejectUnauthorized: false,
          },
        });
      }
      return transporter;
    } catch (err) {
      console.warn('[Email Service] Error initializing SMTP transport:', err);
      return null;
    }
  }

  return null;
}

export async function sendSellerOrderNotificationEmail(
  order: Order,
  sellerEmail: string,
  sellerCompanyName?: string
): Promise<SendOrderEmailResult> {
  const appBaseUrl =
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://seller.sparkgentechnology.in';

  const viewOrderUrl = `${appBaseUrl}/#/seller?tab=orders&orderId=${order.id}`;

  const formattedDate = new Date(order.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subject = `New Order Received - ${order.id}`;

  // Plain Text Version
  const itemsTextTable = order.items
    .map(
      (item) =>
        `${item.productName} | ${item.quantity} | ₹${item.unitPrice.toLocaleString('en-IN')} | ₹${item.subtotal.toLocaleString('en-IN')}`
    )
    .join('\n');

  const textBody = `New Order Received

Order ID: ${order.id}

Customer Details:
Name: ${order.customerName}
Mobile: ${order.customerMobile}
Email: ${order.customerEmail}

Delivery Address:
${order.deliveryAddress.fullAddress}

Order Details:

Product | Quantity | Price | Total

${itemsTextTable}

Subtotal: ₹${order.subtotal.toLocaleString('en-IN')}
Total: ₹${order.totalAmount.toLocaleString('en-IN')}

Order Date:
${formattedDate}

Order Status:
${order.status}

View Order: ${viewOrderUrl}
`;

  // Rich HTML Version
  const itemsHtmlRows = order.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 12px; font-weight: 500; color: #1E293B;">${item.productName}</td>
      <td style="padding: 12px; text-align: center; color: #475569;">${item.quantity} ${item.unit || ''}</td>
      <td style="padding: 12px; text-align: right; color: #475569;">₹${item.unitPrice.toLocaleString('en-IN')}</td>
      <td style="padding: 12px; text-align: right; font-weight: 600; color: #0F172A;">₹${item.subtotal.toLocaleString('en-IN')}</td>
    </tr>`
    )
    .join('');

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>New Order Received - ${order.id}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B;">
    <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <!-- Header -->
      <div style="background: #0284C7; padding: 24px; color: #FFFFFF; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">New Order Received</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Order ID: <strong>${order.id}</strong></p>
      </div>

      <!-- Content -->
      <div style="padding: 24px;">
        <!-- Customer Details -->
        <div style="margin-bottom: 20px; background: #F1F5F9; padding: 16px; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px;">Customer Details</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Name:</strong> ${order.customerName}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Mobile:</strong> <a href="tel:${order.customerMobile}" style="color: #0284C7;">${order.customerMobile}</a></p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${order.customerEmail}" style="color: #0284C7;">${order.customerEmail}</a></p>
        </div>

        <!-- Delivery Address -->
        <div style="margin-bottom: 20px; background: #F1F5F9; padding: 16px; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px;">Delivery Address</h3>
          <p style="margin: 4px 0; font-size: 14px; line-height: 1.5; color: #334155;">
            ${order.deliveryAddress.fullAddress}
          </p>
          ${order.orderNotes ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #475569;"><strong>Notes:</strong> ${order.orderNotes}</p>` : ''}
        </div>

        <!-- Order Items -->
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0F172A;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 2px solid #E2E8F0; text-align: left;">
                <th style="padding: 10px 12px; color: #64748B; font-weight: 600;">Product</th>
                <th style="padding: 10px 12px; text-align: center; color: #64748B; font-weight: 600;">Quantity</th>
                <th style="padding: 10px 12px; text-align: right; color: #64748B; font-weight: 600;">Price</th>
                <th style="padding: 10px 12px; text-align: right; color: #64748B; font-weight: 600;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtmlRows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">Subtotal:</td>
                <td style="padding: 12px; text-align: right; font-weight: 600; color: #0F172A;">₹${order.subtotal.toLocaleString('en-IN')}</td>
              </tr>
              <tr style="border-top: 2px solid #0284C7; font-size: 16px;">
                <td colspan="3" style="padding: 12px; text-align: right; font-weight: 700; color: #0F172A;">Total:</td>
                <td style="padding: 12px; text-align: right; font-weight: 700; color: #0284C7;">₹${order.totalAmount.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Meta Info -->
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 16px; margin-bottom: 24px;">
          <div><strong>Order Date:</strong> ${formattedDate}</div>
          <div><strong>Order Status:</strong> <span style="background: #E0F2FE; color: #0369A1; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${order.status}</span></div>
        </div>

        <!-- View Order CTA Button -->
        <div style="text-align: center; margin-top: 24px;">
          <a href="${viewOrderUrl}" style="display: inline-block; background-color: #0284C7; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(2,132,199,0.3);">
            View Order
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #F8FAFC; padding: 16px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0;">
        This notification was generated automatically by Spark Gen Technology B2B Platform for ${sellerCompanyName || 'Seller'}.
      </div>
    </div>
  </body>
  </html>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Spark Gen Orders" <orders@sparkgentechnology.in>',
    to: sellerEmail,
    cc: process.env.ADMIN_NOTIFICATION_EMAIL || undefined,
    subject,
    text: textBody,
    html: htmlBody,
  };

  const mailer = getEmailTransporter();
  if (mailer) {
    try {
      const info = await mailer.sendMail(mailOptions);
      console.log(`[Email Service] Notification sent successfully for ${order.id} to ${sellerEmail} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[Email Service] SMTP dispatch error for ${order.id}:`, err);
      return { success: false, error: err.message || 'SMTP delivery failure.' };
    }
  } else {
    // Graceful audit log simulation when SMTP is unconfigured in development/preview
    console.log(`\n======================================================`);
    console.log(`📧 [ORDER EMAIL NOTIFICATION DISPATCHED (LOGGED)]`);
    console.log(`To: ${sellerEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Order ID: ${order.id}`);
    console.log(`Customer: ${order.customerName} (${order.customerMobile})`);
    console.log(`Total Amount: ₹${order.totalAmount}`);
    console.log(`View Link: ${viewOrderUrl}`);
    console.log(`======================================================\n`);
    return { success: true, simulated: true };
  }
}
