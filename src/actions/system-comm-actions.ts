'use server';

import { revalidatePath } from 'next/cache';
import { CommEngine, CommConfig, SmtpSettings, WhatsAppSettings } from '@/lib/services/comm-engine';
import { prisma } from '@/lib/prisma';
import { STAFF_FILTER } from '@/lib/dal/staff-repository';

export async function getCommSettings(): Promise<{ success: boolean; config: CommConfig }> {
  try {
    const config = await CommEngine.getConfig();
    return { success: true, config };
  } catch (error: any) {
    return {
      success: false,
      config: {
        emailProvider: 'RESEND',
        resend: { apiKey: '', fromEmail: 'onboarding@resend.dev' },
      },
    };
  }
}

export async function saveCommSettings(config: CommConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await CommEngine.saveConfig(config);
    revalidatePath('/dashboard/system/communications');
    revalidatePath('/dashboard/messaging');
    revalidatePath('/dashboard/system');
    return res;
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save settings.' };
  }
}

export async function testEmailConfig(
  settings: SmtpSettings,
  targetEmail: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!targetEmail || !targetEmail.includes('@')) {
      return { success: false, message: 'Please provide a valid destination email address.' };
    }
    return await CommEngine.testSmtp(settings, targetEmail);
  } catch (error: any) {
    return { success: false, message: error.message || 'SMTP diagnostic failed.' };
  }
}

export async function testWhatsAppConfig(
  settings: WhatsAppSettings,
  targetPhone: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!targetPhone || targetPhone.length < 8) {
      return { success: false, message: 'Please provide a valid phone number (e.g. 08012345678).' };
    }
    return await CommEngine.testWhatsApp(settings, targetPhone);
  } catch (error: any) {
    return { success: false, message: error.message || 'WhatsApp diagnostic failed.' };
  }
}

export async function getCommunicationsOverview() {
  try {
    const [parentsCount, staffCount, blastsCount, activeStudents] = await Promise.all([
      prisma.guardian.count({
        where: {
          student: {
            status: 'Active',
          },
        },
      }),
      prisma.user.count({
        where: {
          status: 'active',
          ...STAFF_FILTER,
        },
      }),
      prisma.messageBlast.count(),
      prisma.student.count({
        where: {
          status: 'Active',
        },
      }),
    ]);

    const config = await CommEngine.getConfig();

    return {
      success: true,
      parentsCount,
      staffCount,
      blastsCount,
      activeStudents,
      emailProvider: config.emailProvider,
      isSmtpConfigured: !!config.smtp?.host && !!config.smtp.user,
      isResendConfigured: !!config.resend?.apiKey && config.resend.apiKey !== 're_dummy_key',
      isWhatsAppEnabled: !!config.whatsapp?.enabled,
      whatsappGateway: config.whatsapp?.gatewayType || 'EVOLUTION_API',
    };
  } catch (error: any) {
    return {
      success: false,
      parentsCount: 0,
      staffCount: 0,
      blastsCount: 0,
      activeStudents: 0,
      emailProvider: 'RESEND' as const,
      isSmtpConfigured: false,
      isResendConfigured: false,
      isWhatsAppEnabled: false,
      whatsappGateway: 'EVOLUTION_API' as const,
    };
  }
}
