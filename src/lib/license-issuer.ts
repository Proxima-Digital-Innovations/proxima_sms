import crypto from 'crypto';
import { prisma } from './prisma';
import { PUBLIC_KEY } from './license-keys';
import { validateSystemLicense, LicensePayload } from './license-utils';

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1Ia6/CF0fsG7S
95ZhqAA+hiWDWuPaee1t4UCyjkg+mOeAcdRtU9A0C4EFPGml+4OeW2myjGRhU2Dl
rDmDl+vJE9OnzXkpGA2IoNuqf6wcG1w81O8JDGr9sOwWPnOwVcJgEfIo+6HK41P5
ieruMBLEZKMba5cMSr8jHaTwrQchuyBIa5uEvr0otKtOQDlupq99cP2/8VdZnwyu
tfTlR2O/OPOIOUGGj0Qmw+9uRxUpPYO8O4A4OkXA0W5ZGvl4n6LPrAjQXMZgJrlQ
d3lKkvqS6KcR4wgqpdw+aKFGKtJvCXaX1KIymWb8kWh44rrBbmKbAJ/L9osRTK9y
UaooebTtAgMBAAECggEAKMdRAqQc5w3/HVLtUcYTbAAigOydAKpTmFnOiYR74k/l
SqcV5pkodhci8G1V8a7qxmOZK7/st3agiYSZHDW/OTFUBOK/BM/r+BcS7VM6Ccfl
H7Lmr9hSXBQRSr67p/bewGc56B0ioz1DwhnZQM+k4f8wM3Oo+XT4jCzX3fFuehq3
wqwI79shm0UmMDl2nhEE08YUQ3FSA5bDyYqbzkAlRH1KHPOqJd2wqNlrJ7xpSN+f
RTC6zdrBSfpekoQHf6J0PWe7XwI4Z23BE7ILoVb19ECNiW3l3yh1QqggWniKa8ez
6IJYfOwgm4d7BLPb7p02qQUSiVSFKik0snPZb9ZWVwKBgQDxo8gBOAQVefZW0/6+
1UDQoVDYTqrcoETEUx4svMwdVJyd9wXlzxhAlETKpFyWiUeLeOC3A28NhjGEWEy4
Ud5N/Xo2RR9LkgEzGurfMa8QQsd30DJ17IJTgy4bhIG+7Xs+ZLggjvjRpLUB3nNB
BvwOHECPokAKDee+nKKg9ABjNwKBgQC/5VoRnzi3e2g8oZzyDs6tzfXcsxW3Vw50
LiCaXRJ6FZU3/SSOcwujmu1+Yn8RWrCkjuY5dqE6hh+LZGEVgv305oex0znzS0+0
HHVEswpb9LwqBpPFzJcrOg4Yk253tYkxePyUzpXgpGtKiRHQfZqjts5eJabhOmOv
b/k2PD4C+wKBgQCmOmEwVXSZwZjxCk1IwjMgUpjm9NcdhzNHS1aKuCZCVx6WnIR2
Hw0z/8uDC6aV+EI7dCBCRh5zU0llHclJUyh2xlT4WHy64+nnWjEQ8YDY0tedWKAd
92GASdHCJFmNGpmZxnfUDgalUYUjkAABT+i9XDodlSQwxngR7HcD+lb56QKBgEUd
4bwZIj+MFnZIK5RP2wdk+Jo+cqLvm0gjWSDgRwhr/6wD5IfeTiHmaoYsCeKBTMBo
q+mkndvLdU8qn4E1Bi2QXu2gy+2igZm46lANQLzwQFnOtqj20LgEGBGoAJDjdP+5
uRgL9JXOAsr85cq3gtxWuqvUWfAjrMYCybtMJXXDAoGATGhMvgZ6c0B4VenkJ13/
Z0RVBLGdYKyTz+V7eSm9tf/3FZ37VfhD2KC0m3ROvnJq4w1/53pHAlbMB+7KN3aP
7+F1PcXxgEfh/NdsnPSW45zO3OQh8M7d8SvrGt2L2LzdA0kndKYke5pVrkEXD2vA
SOfKfZUoLXrU4dYhb8QZwyM=
-----END PRIVATE KEY-----`;

export function generateCryptographicLicense(payload: LicensePayload): string {
  const payloadString = JSON.stringify(payload);
  const base64Payload = Buffer.from(payloadString, 'utf8').toString('base64');

  const signer = crypto.createSign('SHA256');
  signer.update(payloadString);
  signer.end();
  const signature = signer.sign(PRIVATE_KEY, 'base64');

  const key = `${base64Payload}.${signature}`;

  // Self verify before returning
  const verifier = crypto.createVerify('SHA256');
  verifier.update(payloadString);
  verifier.end();
  const verified = verifier.verify(PUBLIC_KEY, signature, 'base64');
  if (!verified) {
    throw new Error('Cryptographic signature verification failed.');
  }

  return key;
}

export async function issueAndApplyEnterpriseLicense(customPayload?: Partial<LicensePayload>) {
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const payload: LicensePayload = {
    schoolName: customPayload?.schoolName || 'Proxima International Academy',
    maxStudents: customPayload?.maxStudents || 3000,
    tier: customPayload?.tier || 'ENTERPRISE',
    billingFrequency: customPayload?.billingFrequency || 'PER_SESSION',
    discountPercent: customPayload?.discountPercent ?? 10,
    expiresAt: customPayload?.expiresAt || expiryDate.toISOString(),
    issuedAt: new Date().toISOString()
  };

  const licenseKey = generateCryptographicLicense(payload);

  await prisma.systemLicense.deleteMany();
  const record = await prisma.systemLicense.create({
    data: {
      licenseKey,
      schoolName: payload.schoolName,
      tier: payload.tier,
      billingFrequency: payload.billingFrequency || 'PER_SESSION',
      discountPercent: payload.discountPercent || 0,
      expiresAt: new Date(payload.expiresAt),
      maxStudents: payload.maxStudents,
      status: 'ACTIVE',
      lastValidatedAt: new Date()
    }
  });

  const validation = await validateSystemLicense();
  return { success: true, licenseKey, record, validation };
}
