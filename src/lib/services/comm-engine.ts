import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface ResendSettings {
  apiKey: string;
  fromEmail: string;
}

export interface WhatsAppSettings {
  enabled: boolean;
  gatewayType: 'EVOLUTION_API' | 'WAHA' | 'GENERIC_WEBHOOK';
  apiUrl: string;
  apiKey?: string;
  instanceName?: string;
}

export interface CommConfig {
  emailProvider: 'SMTP' | 'RESEND';
  smtp?: SmtpSettings;
  resend?: ResendSettings;
  whatsapp?: WhatsAppSettings;
}

export interface EmailPayload {
  to: string | string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  react?: React.ReactElement;
}

export interface CommSendResult {
  success: boolean;
  provider: string;
  messageId?: string;
  sentCount: number;
  failedCount: number;
  errors?: string[];
  warning?: string;
}

export class CommEngine {
  /**
   * Load active communication configuration from Database with environment fallback.
   */
  static async getConfig(): Promise<CommConfig> {
    try {
      const profile = await prisma.systemProfile.findFirst();
      if (profile?.commConfig) {
        try {
          const parsed = JSON.parse(profile.commConfig) as CommConfig;
          if (parsed && (parsed.emailProvider || parsed.whatsapp)) {
            return parsed;
          }
        } catch {
          // Ignore parse error, fallback to env
        }
      }

      // Default fallback from environment variables
      const hasSmtp = !!process.env.SMTP_HOST && !!process.env.SMTP_USER;
      const hasResend = !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_dummy_key';

      return {
        emailProvider: hasSmtp ? 'SMTP' : 'RESEND',
        smtp: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 465,
          secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
          fromName: profile?.name || 'Proxima SMS Academy',
          fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER || 'bursary@proxima.edu',
        },
        resend: {
          apiKey: process.env.RESEND_API_KEY || '',
          fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        },
        whatsapp: {
          enabled: process.env.WHATSAPP_ENABLED === 'true',
          gatewayType: (process.env.WHATSAPP_GATEWAY as any) || 'EVOLUTION_API',
          apiUrl: process.env.WHATSAPP_API_URL || 'http://localhost:8080',
          apiKey: process.env.WHATSAPP_API_KEY || '',
          instanceName: process.env.WHATSAPP_INSTANCE || 'school-alerts',
        }
      };
    } catch {
      return {
        emailProvider: 'RESEND',
        resend: {
          apiKey: process.env.RESEND_API_KEY || '',
          fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        }
      };
    }
  }

  /**
   * Save updated communication configuration to Database.
   */
  static async saveConfig(config: CommConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const profile = await prisma.systemProfile.findFirst();
      if (!profile) {
        return { success: false, error: 'System profile not found.' };
      }

      await prisma.systemProfile.update({
        where: { id: profile.id },
        data: {
          commConfig: JSON.stringify(config),
        },
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to persist communication settings.' };
    }
  }

  /**
   * Universal Email Dispatcher (SMTP via Nodemailer or Resend)
   */
  static async sendEmail(payload: EmailPayload): Promise<CommSendResult> {
    const config = await this.getConfig();
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const bccRecipients = payload.bcc || [];
    const totalTargets = recipients.length + bccRecipients.length;

    if (totalTargets === 0) {
      return { success: true, provider: 'NONE', sentCount: 0, failedCount: 0 };
    }

    // --- STRATEGY 1: NATIVE OPEN-SOURCE SMTP (Nodemailer) ---
    if (config.emailProvider === 'SMTP' && config.smtp?.host && config.smtp.user) {
      try {
        const transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        // Format sender
        const sender = `"${config.smtp.fromName || 'School Management'}" <${config.smtp.fromEmail || config.smtp.user}>`;

        // If rendering React Email template, convert to HTML string
        let htmlBody = payload.html;
        if (!htmlBody && payload.react) {
          const { render } = await import('@react-email/components');
          htmlBody = await render(payload.react);
        }

        const info = await transporter.sendMail({
          from: sender,
          to: payload.to,
          bcc: payload.bcc,
          subject: payload.subject,
          text: payload.text,
          html: htmlBody,
        });

        return {
          success: true,
          provider: 'SMTP',
          messageId: info.messageId,
          sentCount: totalTargets,
          failedCount: 0,
        };
      } catch (err: any) {
        console.error('[CommEngine] SMTP Send Failure:', err);
        return {
          success: false,
          provider: 'SMTP',
          sentCount: 0,
          failedCount: totalTargets,
          errors: [err.message || 'SMTP delivery failed.'],
        };
      }
    }

    // --- STRATEGY 2: RESEND API ---
    if (config.resend?.apiKey && config.resend.apiKey !== 're_dummy_key') {
      try {
        const resend = new Resend(config.resend.apiKey);
        const fromAddress = config.resend.fromEmail || 'onboarding@resend.dev';
        const schoolName = config.smtp?.fromName || 'Proxima SMS Academy';

        const isSandbox = fromAddress.includes('onboarding@resend.dev');

        let htmlBody = payload.html;
        if (!htmlBody && payload.react) {
          const { render } = await import('@react-email/components');
          htmlBody = await render(payload.react);
        }

        const allRecipients = Array.from(new Set([...recipients, ...bccRecipients]));
        let sent = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const recipient of allRecipients) {
          try {
            const sendRes = await resend.emails.send({
              from: `${schoolName} <${fromAddress}>`,
              to: [recipient],
              subject: payload.subject,
              html: htmlBody || payload.text || '',
            });

            if (sendRes.error) {
              failed++;
              errors.push(`${recipient}: ${sendRes.error.message}`);
            } else {
              sent++;
            }
          } catch (e: any) {
            failed++;
            errors.push(`${recipient}: ${e.message}`);
          }
        }

        const hasPartialSuccess = sent > 0;
        const warning = isSandbox && failed > 0 
          ? 'Resend is in Sandbox Mode (onboarding@resend.dev). Non-testing domains are rejected by Resend. Configure custom domain or switch to SMTP.'
          : undefined;

        return {
          success: hasPartialSuccess || (sent === 0 && isSandbox),
          provider: 'RESEND',
          sentCount: sent,
          failedCount: failed,
          errors: errors.slice(0, 5),
          warning,
        };
      } catch (err: any) {
        console.error('[CommEngine] Resend Send Failure:', err);
        return {
          success: false,
          provider: 'RESEND',
          sentCount: 0,
          failedCount: totalTargets,
          errors: [err.message || 'Resend delivery failed.'],
        };
      }
    }

    return {
      success: false,
      provider: 'NONE',
      sentCount: 0,
      failedCount: totalTargets,
      errors: ['No email gateway configured. Please setup SMTP or Resend in System Configuration.'],
    };
  }

  /**
   * Phone number normalizer for WhatsApp / SMS
   */
  static formatPhoneNumber(rawPhone: string, defaultCountryCode = '234'): string {
    const cleaned = rawPhone.replace(/\D/g, '');
    if (!cleaned) return '';

    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return defaultCountryCode + cleaned.substring(1);
    }

    if (cleaned.startsWith('234') && cleaned.length === 13) {
      return cleaned;
    }

    if (cleaned.length >= 10) {
      return cleaned;
    }

    return defaultCountryCode + cleaned;
  }

  /**
   * Open-Source WhatsApp Message Dispatcher
   * Compatible with Evolution API, WAHA (WhatsApp HTTP API), and Generic Webhooks
   */
  static async sendWhatsApp(phone: string, message: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
    const config = await this.getConfig();
    const wa = config.whatsapp;

    if (!wa || !wa.enabled || !wa.apiUrl) {
      return { 
        success: false, 
        error: 'WhatsApp gateway is currently disabled or unconfigured in System Settings.' 
      };
    }

    const formattedPhone = this.formatPhoneNumber(phone);
    if (!formattedPhone) {
      return { success: false, error: 'Invalid recipient phone number.' };
    }

    try {
      const cleanUrl = wa.apiUrl.replace(/\/$/, '');

      if (wa.gatewayType === 'EVOLUTION_API') {
        const endpoint = `${cleanUrl}/message/sendText/${wa.instanceName || 'school-alerts'}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(wa.apiKey ? { 'apikey': wa.apiKey } : {})
          },
          body: JSON.stringify({
            number: formattedPhone,
            options: { delay: 1200, presence: 'composing' },
            textMessage: { text: message }
          })
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Evolution API error HTTP ${res.status}: ${errBody}`);
        }

        const data = await res.json();
        return { success: true, messageId: data?.key?.id || 'EVO-OK' };
      }

      if (wa.gatewayType === 'WAHA') {
        const endpoint = `${cleanUrl}/api/sendText`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(wa.apiKey ? { 'X-Api-Key': wa.apiKey } : {})
          },
          body: JSON.stringify({
            chatId: `${formattedPhone}@c.us`,
            text: message,
            session: wa.instanceName || 'default'
          })
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`WAHA API error HTTP ${res.status}: ${errBody}`);
        }

        const data = await res.json();
        return { success: true, messageId: data?.id || 'WAHA-OK' };
      }

      // Generic Webhook Fallback
      const res = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(wa.apiKey ? { 'Authorization': `Bearer ${wa.apiKey}` } : {})
        },
        body: JSON.stringify({
          to: formattedPhone,
          message,
          timestamp: new Date().toISOString()
        })
      });

      if (!res.ok) {
        throw new Error(`Webhook error HTTP ${res.status}`);
      }

      return { success: true };
    } catch (e: any) {
      console.error('[CommEngine] WhatsApp Dispatch Error:', e);
      return { success: false, error: e.message || 'Failed to dispatch WhatsApp message.' };
    }
  }

  /**
   * Diagnostic: Test SMTP connection and handshake
   */
  static async testSmtp(settings: SmtpSettings, targetEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      const transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: {
          user: settings.user,
          pass: settings.pass,
        },
        tls: { rejectUnauthorized: false }
      });

      // 1. Verify credentials handshake
      await transporter.verify();

      // 2. Send actual verification ping
      await transporter.sendMail({
        from: `"${settings.fromName || 'Proxima SMS'}" <${settings.fromEmail || settings.user}>`,
        to: targetEmail,
        subject: 'Proxima SMS - SMTP Gateway Verified',
        html: `
          <div style="font-family: sans-serif; padding: 24px; color: #0f172a; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #10b981; margin-bottom: 8px;">SMTP Connection Successful</h2>
            <p style="font-size: 14px; line-height: 1.5;">This verification message confirms that your school's SMTP gateway is authenticated and actively transmitting.</p>
            <table style="border-collapse: collapse; font-size: 13px; margin: 16px 0; width: 100%;">
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; font-weight: bold; color: #64748b;">Host:</td><td style="font-family: monospace;">${settings.host}:${settings.port}</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; font-weight: bold; color: #64748b;">Account:</td><td style="font-family: monospace;">${settings.user}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold; color: #64748b;">Encryption:</td><td>${settings.secure ? 'SSL/TLS (Port 465)' : 'STARTTLS (Port 587)'}</td></tr>
            </table>
            <p style="font-size: 11px; color: #94a3b8; margin-top: 16px;">Dispatched from Proxima SMS Communications Core.</p>
          </div>
        `
      });

      return { success: true, message: `Handshake verified! Test email delivered to ${targetEmail}.` };
    } catch (err: any) {
      return { success: false, message: err.message || 'SMTP verification failed.' };
    }
  }

  /**
   * Diagnostic: Test WhatsApp connection with live ping
   */
  static async testWhatsApp(settings: WhatsAppSettings, targetPhone: string): Promise<{ success: boolean; message: string }> {
    if (!settings.apiUrl) {
      return { success: false, message: 'API URL is required.' };
    }

    const formattedPhone = this.formatPhoneNumber(targetPhone);
    if (!formattedPhone) {
      return { success: false, message: 'Valid phone number is required.' };
    }

    const testMessage = `Proxima SMS WhatsApp Gateway Test: Verification ping sent successfully at ${new Date().toLocaleTimeString()}.`;

    try {
      const cleanUrl = settings.apiUrl.replace(/\/$/, '');

      if (settings.gatewayType === 'EVOLUTION_API') {
        const endpoint = `${cleanUrl}/message/sendText/${settings.instanceName || 'school-alerts'}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(settings.apiKey ? { 'apikey': settings.apiKey } : {})
          },
          body: JSON.stringify({
            number: formattedPhone,
            options: { delay: 1000, presence: 'composing' },
            textMessage: { text: testMessage }
          })
        });

        if (!res.ok) {
          const errBody = await res.text();
          return { success: false, message: `Evolution API HTTP ${res.status}: ${errBody}` };
        }

        return { success: true, message: `Test message dispatched to +${formattedPhone} via Evolution API.` };
      }

      if (settings.gatewayType === 'WAHA') {
        const endpoint = `${cleanUrl}/api/sendText`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(settings.apiKey ? { 'X-Api-Key': settings.apiKey } : {})
          },
          body: JSON.stringify({
            chatId: `${formattedPhone}@c.us`,
            text: testMessage,
            session: settings.instanceName || 'default'
          })
        });

        if (!res.ok) {
          const errBody = await res.text();
          return { success: false, message: `WAHA API HTTP ${res.status}: ${errBody}` };
        }

        return { success: true, message: `Test message dispatched to +${formattedPhone} via WAHA.` };
      }

      // Generic webhook
      const res = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey ? { 'Authorization': `Bearer ${settings.apiKey}` } : {})
        },
        body: JSON.stringify({
          to: formattedPhone,
          message: testMessage,
          timestamp: new Date().toISOString()
        })
      });

      if (!res.ok) {
        return { success: false, message: `Webhook responded with HTTP ${res.status}.` };
      }

      return { success: true, message: `Test payload delivered to webhook URL.` };
    } catch (e: any) {
      return { success: false, message: e.message || 'WhatsApp connection test failed.' };
    }
  }

  /**
   * Transactional: Dispatch official fee payment receipt to guardian
   */
  static async sendReceiptNotification(data: {
    guardianName: string;
    guardianEmail?: string | null;
    guardianPhone?: string | null;
    studentName: string;
    studentId: string;
    className: string;
    receiptNumber: string;
    amountPaid: number;
    balanceRemaining: number;
    paymentMethod: string;
    date: Date;
  }): Promise<{ emailSent: boolean; whatsappSent: boolean }> {
    const config = await this.getConfig();
    const schoolName = config.smtp?.fromName || 'Proxima SMS Academy';
    const formattedAmount = `₦${data.amountPaid.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    const formattedBalance = `₦${data.balanceRemaining.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    const formattedDate = data.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    let emailSent = false;
    let whatsappSent = false;

    // 1. Email notification
    if (data.guardianEmail && data.guardianEmail.includes('@')) {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 28px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">${schoolName}</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Official Fee Payment Receipt</p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="font-size: 15px; color: #334155; margin-top: 0;">Dear <strong>${data.guardianName}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              We acknowledge receipt of your school fee payment for <strong>${data.studentName}</strong> (${data.className}). Details of this transaction are documented below:
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Receipt Number:</td>
                  <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">${data.receiptNumber}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Student:</td>
                  <td style="padding: 8px 0; text-align: right; color: #0f172a;">${data.studentName} (${data.studentId})</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Date:</td>
                  <td style="padding: 8px 0; text-align: right; color: #0f172a;">${formattedDate}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Method:</td>
                  <td style="padding: 8px 0; text-align: right; color: #0f172a; text-transform: uppercase;">${data.paymentMethod}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #15803d; font-weight: 700; font-size: 14px;">Amount Paid:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 800; font-size: 16px; color: #15803d;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Outstanding Balance:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 700; color: ${data.balanceRemaining > 0 ? '#b91c1c' : '#15803d'};">${formattedBalance}</td>
                </tr>
              </table>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
              Thank you for your prompt commitment towards academic excellence. This digital receipt serves as official proof of payment.
            </p>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            Bursary & Accounts Division &bull; ${schoolName}
          </div>
        </div>
      `;

      try {
        const res = await this.sendEmail({
          to: data.guardianEmail,
          subject: `Payment Receipt: ${data.receiptNumber} - ${data.studentName}`,
          html: emailHtml,
          text: `Payment Receipt for ${data.studentName}. Amount Paid: ${formattedAmount}. Outstanding Balance: ${formattedBalance}. Receipt: ${data.receiptNumber}.`,
        });
        emailSent = res.success;
      } catch (err) {
        console.error('[CommEngine] Receipt email error:', err);
      }
    }

    // 2. WhatsApp notification
    if (data.guardianPhone && config.whatsapp?.enabled) {
      const waText = `*${schoolName.toUpperCase()} - FEE RECEIPT*\n\n` +
        `Dear ${data.guardianName},\n` +
        `We confirm receipt of *${formattedAmount}* for *${data.studentName}* (${data.className}).\n\n` +
        `*Receipt No:* ${data.receiptNumber}\n` +
        `*Date:* ${formattedDate}\n` +
        `*Method:* ${data.paymentMethod.toUpperCase()}\n` +
        `*Balance Remaining:* ${formattedBalance}\n\n` +
        `Thank you for your partnership.`;

      try {
        const res = await this.sendWhatsApp(data.guardianPhone, waText);
        whatsappSent = res.success;
      } catch (err) {
        console.error('[CommEngine] Receipt WhatsApp error:', err);
      }
    }

    return { emailSent, whatsappSent };
  }

  /**
   * Transactional: Dispatch official fee reminder notice to guardian
   */
  static async sendFeeReminder(data: {
    guardianName: string;
    guardianEmail?: string | null;
    guardianPhone?: string | null;
    studentName: string;
    studentId: string;
    className: string;
    invoiceNumber: string;
    amountDue: number;
    dueDate: string;
    paymentLink?: string;
    currencySymbol?: string;
  }): Promise<{ success: boolean; emailSent: boolean; whatsappSent: boolean; warning?: string }> {
    const config = await this.getConfig();
    const schoolName = config.smtp?.fromName || 'Proxima SMS Academy';
    const sym = data.currencySymbol || '₦';
    const formattedDue = `${sym}${data.amountDue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

    let emailSent = false;
    let whatsappSent = false;

    // 1. Email Reminder
    if (data.guardianEmail && data.guardianEmail.includes('@')) {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 28px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">${schoolName}</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Tuition & Fee Reminder</p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="font-size: 15px; color: #334155; margin-top: 0;">Dear <strong>${data.guardianName}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              This is a gentle reminder regarding the outstanding school fee obligation for <strong>${data.studentName}</strong> (${data.className}).
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Invoice Number:</td>
                  <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">${data.invoiceNumber}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Student:</td>
                  <td style="padding: 8px 0; text-align: right; color: #0f172a;">${data.studentName} (${data.studentId})</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Due Date:</td>
                  <td style="padding: 8px 0; text-align: right; color: #dc2626; font-weight: 700;">${data.dueDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Amount Outstanding:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 800; font-size: 16px; color: #dc2626;">${formattedDue}</td>
                </tr>
              </table>
            </div>
            ${data.paymentLink ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="${data.paymentLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                Pay Invoice Online
              </a>
            </div>
            ` : ''}
            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
              Please arrange for settlement on or before the due date to ensure uninterrupted academic sessions. If you have already made payment, kindly notify the bursary with your proof of payment.
            </p>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            Bursary & Accounts Division &bull; ${schoolName}
          </div>
        </div>
      `;

      try {
        const res = await this.sendEmail({
          to: data.guardianEmail,
          subject: `Fee Reminder: ${data.studentName} - Outstanding Balance (${data.invoiceNumber})`,
          html: emailHtml,
          text: `Fee Reminder for ${data.studentName}. Outstanding Balance: ${formattedDue}. Due Date: ${data.dueDate}. Invoice: ${data.invoiceNumber}.`,
        });
        emailSent = res.success;
      } catch (err) {
        console.error('[CommEngine] Reminder email error:', err);
      }
    }

    // 2. WhatsApp Reminder
    if (data.guardianPhone && config.whatsapp?.enabled) {
      const waText = `*${schoolName.toUpperCase()} - FEE REMINDER*\n\n` +
        `Dear ${data.guardianName},\n` +
        `This is a reminder regarding the outstanding fee of *${formattedDue}* for *${data.studentName}* (${data.className}).\n\n` +
        `*Invoice:* ${data.invoiceNumber}\n` +
        `*Due Date:* ${data.dueDate}\n` +
        (data.paymentLink ? `*Pay Online:* ${data.paymentLink}\n\n` : '\n') +
        `Kindly ensure payment is concluded promptly. Thank you.`;

      try {
        const res = await this.sendWhatsApp(data.guardianPhone, waText);
        whatsappSent = res.success;
      } catch (err) {
        console.error('[CommEngine] Reminder WhatsApp error:', err);
      }
    }

    return {
      success: emailSent || whatsappSent,
      emailSent,
      whatsappSent,
      warning: (!emailSent && !whatsappSent) ? 'Gateway not configured or delivery skipped' : undefined,
    };
  }

  /**
   * Transactional: Dispatch staff welcome and login credentials
   */
  static async sendStaffWelcomeNotification(data: {
    staffName: string;
    staffEmail: string;
    staffId: string;
    role: string;
    temporaryPassword?: string;
    loginUrl?: string;
  }): Promise<{ emailSent: boolean }> {
    const config = await this.getConfig();
    const schoolName = config.smtp?.fromName || 'Proxima SMS Academy';
    const loginUrl = data.loginUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000/login';

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">${schoolName}</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Staff Onboarding & Access Credentials</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="font-size: 15px; color: #334155; margin-top: 0;">Dear <strong>${data.staffName}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Welcome to the academic and operational faculty at <strong>${schoolName}</strong>. Your staff profile has been provisioned on the school management portal.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Staff ID:</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">${data.staffId}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Assigned Role:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">${data.role}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Portal Username / Email:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">${data.staffEmail}</td>
              </tr>
              ${data.temporaryPassword ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Temporary Password:</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: 700; color: #2563eb;">${data.temporaryPassword}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${loginUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
              Sign In to Staff Portal
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
            Security Notice: For security precautions, you will be prompted to update your password upon your initial sign-in. Do not share your credentials with unauthorized personnel.
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          Human Resources & Registry &bull; ${schoolName}
        </div>
      </div>
    `;

    try {
      const res = await this.sendEmail({
        to: data.staffEmail,
        subject: `Welcome to ${schoolName} - Staff Portal Access Credentials`,
        html: emailHtml,
        text: `Welcome to ${schoolName}. Your Staff ID is ${data.staffId}. Access the portal at ${loginUrl}.`,
      });
      return { emailSent: res.success };
    } catch (err) {
      console.error('[CommEngine] Staff welcome email error:', err);
      return { emailSent: false };
    }
  }

  /**
   * Transactional: Dispatch real-time absence alert to parent/guardian
   */
  static async sendAttendanceAbsenceAlert(data: {
    guardianName: string;
    guardianEmail?: string | null;
    guardianPhone?: string | null;
    studentName: string;
    className: string;
    date: Date;
    reason?: string;
  }): Promise<{ emailSent: boolean; whatsappSent: boolean }> {
    const config = await this.getConfig();
    const schoolName = config.smtp?.fromName || 'Proxima SMS Academy';
    const formattedDate = data.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    let emailSent = false;
    let whatsappSent = false;

    // 1. Email Alert
    if (data.guardianEmail && data.guardianEmail.includes('@')) {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #991b1b; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 700;">${schoolName}</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #fecaca;">Attendance Alert: Student Absent</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px; color: #334155; margin-top: 0;">Dear <strong>${data.guardianName}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Please be informed that <strong>${data.studentName}</strong> was marked <strong>ABSENT</strong> from roll call for <strong>${data.className}</strong> on <strong>${formattedDate}</strong>.
            </p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px; color: #991b1b;">
              If this absence was unexpected, kindly contact the school administration or class supervisor immediately.
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Automated Academic Safety & Roll Call Service.</p>
          </div>
        </div>
      `;

      try {
        const res = await this.sendEmail({
          to: data.guardianEmail,
          subject: `Attendance Alert: ${data.studentName} Marked Absent (${formattedDate})`,
          html: emailHtml,
          text: `Attendance Notice: ${data.studentName} was marked absent for ${data.className} on ${formattedDate}. Contact the school if this was unexpected.`,
        });
        emailSent = res.success;
      } catch (err) {
        console.error('[CommEngine] Absence email error:', err);
      }
    }

    // 2. WhatsApp Alert
    if (data.guardianPhone && config.whatsapp?.enabled) {
      const waText = `*🚨 ${schoolName.toUpperCase()} - ATTENDANCE NOTICE*\n\n` +
        `Dear ${data.guardianName},\n` +
        `Please be notified that *${data.studentName}* was marked *ABSENT* for *${data.className}* on *${formattedDate}*.\n\n` +
        `If this absence was unplanned, please contact the school administration immediately.`;

      try {
        const res = await this.sendWhatsApp(data.guardianPhone, waText);
        whatsappSent = res.success;
      } catch (err) {
        console.error('[CommEngine] Absence WhatsApp error:', err);
      }
    }

    return { emailSent, whatsappSent };
  }

  /**
   * Transactional: Dispatch newly graded assessment notification to student / parent
   */
  static async sendGradeAlert(data: {
    recipientName: string;
    recipientEmail?: string | null;
    recipientPhone?: string | null;
    studentName: string;
    courseOrSubject: string;
    assessmentTitle: string;
    score: number;
    maxScore: number;
    feedback?: string | null;
  }): Promise<{ emailSent: boolean; whatsappSent: boolean }> {
    const config = await this.getConfig();
    const schoolName = config.smtp?.fromName || 'Proxima SMS Academy';
    const percent = Math.round((data.score / (data.maxScore || 100)) * 100);

    let emailSent = false;
    let whatsappSent = false;

    // 1. Email Alert
    if (data.recipientEmail && data.recipientEmail.includes('@')) {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 700;">${schoolName}</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Academic Assessment Result Published</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px; color: #334155; margin-top: 0;">Dear <strong>${data.recipientName}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              A new assessment has been evaluated for <strong>${data.studentName}</strong> in <strong>${data.courseOrSubject}</strong>:
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 16px 0;">
              <table style="width: 100%; font-size: 13px;">
                <tr><td style="color: #64748b; font-weight: 600;">Assessment:</td><td style="text-align: right; font-weight: 700;">${data.assessmentTitle}</td></tr>
                <tr><td style="color: #64748b; font-weight: 600;">Score:</td><td style="text-align: right; font-weight: 800; font-size: 16px; color: #16a34a;">${data.score} / ${data.maxScore} (${percent}%)</td></tr>
                ${data.feedback ? `<tr><td style="color: #64748b; font-weight: 600; vertical-align: top; padding-top: 6px;">Feedback:</td><td style="text-align: right; color: #334155; padding-top: 6px; font-style: italic;">"${data.feedback}"</td></tr>` : ''}
              </table>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Log into the student / parent portal to review the comprehensive gradebook.</p>
          </div>
        </div>
      `;

      try {
        const res = await this.sendEmail({
          to: data.recipientEmail,
          subject: `Grade Published: ${data.assessmentTitle} - ${data.studentName} (${data.score}/${data.maxScore})`,
          html: emailHtml,
          text: `Grade Released: ${data.studentName} received ${data.score}/${data.maxScore} in ${data.courseOrSubject} for "${data.assessmentTitle}".`,
        });
        emailSent = res.success;
      } catch (err) {
        console.error('[CommEngine] Grade email error:', err);
      }
    }

    // 2. WhatsApp Alert
    if (data.recipientPhone && config.whatsapp?.enabled) {
      const waText = `*📝 ${schoolName.toUpperCase()} - GRADE RELEASED*\n\n` +
        `Dear ${data.recipientName},\n` +
        `The assessment results for *${data.studentName}* have been posted:\n\n` +
        `*Course/Subject:* ${data.courseOrSubject}\n` +
        `*Assessment:* ${data.assessmentTitle}\n` +
        `*Score:* ${data.score} / ${data.maxScore} (${percent}%)\n` +
        (data.feedback ? `*Lecturer Feedback:* "${data.feedback}"\n\n` : '\n') +
        `Review complete academic progress on the parent portal.`;

      try {
        const res = await this.sendWhatsApp(data.recipientPhone, waText);
        whatsappSent = res.success;
      } catch (err) {
        console.error('[CommEngine] Grade WhatsApp error:', err);
      }
    }

    return { emailSent, whatsappSent };
  }

}
