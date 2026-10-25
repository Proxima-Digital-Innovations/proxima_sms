const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

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

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtSGuvwhdH7Bu0veWYagA
PoYlg1rj2nntbeFAso5IPpjngHHUbVPQNAuBBTxppfuDnltpsoxkYVNg5aw5g5fr
yRPTp815KRgNiKDbqn+sHBtcPNTvCQxq/bDsFj5zsFXCYBHyKPuhyuNT+Ynq7jAS
xGSjG2uXDEq/Ix2k8K0HIbsgSGubhL69KLSrTkA5bqavfXD9v/FXWZ8MrrX05Udj
vzjziDlBho9EJsPvbkcVKT2DvDuAODpFwNFuWRr5eJ+iz6wI0FzGYCa5UHd5SpL6
kuinEeMIKqXcPmihRirSbwl2l9SiMplm/JFoeOK6wW5imwCfy/aLEUyvclGqKHm0
7QIDAQAB
-----END PUBLIC KEY-----`;

function generateSignedLicense(payload) {
  const payloadString = JSON.stringify(payload);
  const base64Payload = Buffer.from(payloadString, 'utf8').toString('base64');

  const signer = crypto.createSign('SHA256');
  signer.update(payloadString);
  signer.end();
  const signature = signer.sign(PRIVATE_KEY, 'base64');

  const key = `${base64Payload}.${signature}`;

  // Self verify
  const verifier = crypto.createVerify('SHA256');
  verifier.update(payloadString);
  verifier.end();
  const verified = verifier.verify(PUBLIC_KEY, signature, 'base64');
  if (!verified) {
    throw new Error('Cryptographic signature verification failed.');
  }

  return key;
}

async function main() {
  const prisma = new PrismaClient();
  
  // Create an active enterprise license with 1 year validity
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const payload = {
    schoolName: 'Proxima International Academy',
    maxStudents: 3000,
    tier: 'ENTERPRISE',
    billingFrequency: 'PER_SESSION',
    discountPercent: 10,
    expiresAt: expiryDate.toISOString(),
    issuedAt: new Date().toISOString()
  };

  const key = generateSignedLicense(payload);
  console.log('Generated Valid Key:', key);

  // Clear existing licenses and insert the active one
  await prisma.systemLicense.deleteMany();
  const record = await prisma.systemLicense.create({
    data: {
      licenseKey: key,
      schoolName: payload.schoolName,
      tier: payload.tier,
      billingFrequency: payload.billingFrequency,
      discountPercent: payload.discountPercent,
      expiresAt: expiryDate,
      maxStudents: payload.maxStudents,
      status: 'ACTIVE',
      lastValidatedAt: new Date()
    }
  });

  console.log('Seeded SystemLicense record successfully:', record.id);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error generating license:', err);
  process.exit(1);
});
