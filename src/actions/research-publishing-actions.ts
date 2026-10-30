'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function sanitize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// ==============================================================================
// 1. ACADEMIC JOURNALS & ISSUES ACTIONS
// ==============================================================================

export async function getJournalListAction() {
  try {
    let journals = await prisma.academicJournal.findMany({
      include: {
        _count: {
          select: {
            issues: true,
            articles: true,
          },
        },
        issues: {
          orderBy: [{ volume: 'desc' }, { issueNumber: 'desc' }],
          take: 3,
        },
      },
      orderBy: { title: 'asc' },
    });

    if (journals.length === 0) {
      await seedDefaultJournalsAndBulletins();
      journals = await prisma.academicJournal.findMany({
        include: {
          _count: {
            select: {
              issues: true,
              articles: true,
            },
          },
          issues: {
            orderBy: [{ volume: 'desc' }, { issueNumber: 'desc' }],
            take: 3,
          },
        },
        orderBy: { title: 'asc' },
      });
    }

    return { success: true, data: sanitize(journals) };
  } catch (err: any) {
    console.error('getJournalListAction error:', err);
    return { success: false, error: err.message || 'Failed to fetch academic journals.' };
  }
}

export async function getJournalDetailsAction(journalIdOrCode: string) {
  try {
    const journal = await prisma.academicJournal.findFirst({
      where: {
        OR: [{ id: journalIdOrCode }, { code: journalIdOrCode }],
      },
      include: {
        issues: {
          orderBy: [{ volume: 'desc' }, { issueNumber: 'desc' }],
          include: {
            articles: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        articles: {
          orderBy: { createdAt: 'desc' },
          include: {
            issue: true,
            peerReviews: true,
          },
        },
      },
    });

    if (!journal) {
      return { success: false, error: 'Journal not found' };
    }

    return { success: true, data: sanitize(journal) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createJournalAction(data: {
  title: string;
  code: string;
  issn?: string;
  eIssn?: string;
  description?: string;
  scopeAndAim?: string;
  faculty?: string;
  department?: string;
  editorInChief?: string;
}) {
  try {
    const existing = await prisma.academicJournal.findUnique({
      where: { code: data.code.toUpperCase().trim() },
    });
    if (existing) {
      return { success: false, error: `Journal code "${data.code}" already exists.` };
    }

    const journal = await prisma.academicJournal.create({
      data: {
        title: data.title,
        code: data.code.toUpperCase().trim(),
        issn: data.issn || null,
        eIssn: data.eIssn || null,
        description: data.description || null,
        scopeAndAim: data.scopeAndAim || null,
        faculty: data.faculty || null,
        department: data.department || null,
        editorInChief: data.editorInChief || null,
        status: 'ACTIVE',
      },
    });

    try {
      revalidatePath('/dashboard/tertiary/research');
      revalidatePath('/dashboard/tertiary/bulletins');
    } catch {}

    return { success: true, data: sanitize(journal) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createJournalIssueAction(data: {
  journalId: string;
  volume: number;
  issueNumber: number;
  title?: string;
  publicationDate?: Date;
  status?: string;
}) {
  try {
    const issue = await prisma.journalIssue.create({
      data: {
        journalId: data.journalId,
        volume: Number(data.volume),
        issueNumber: Number(data.issueNumber),
        title: data.title || `Vol. ${data.volume} No. ${data.issueNumber} (${new Date().getFullYear()})`,
        publicationDate: data.publicationDate || new Date(),
        status: data.status || 'PUBLISHED',
      },
    });

    try {
      revalidatePath('/dashboard/tertiary/research');
    } catch {}

    return { success: true, data: sanitize(issue) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==============================================================================
// 2. MANUSCRIPT SUBMISSION & PEER REVIEW ACTIONS
// ==============================================================================

export async function submitJournalArticleAction(data: {
  journalId: string;
  title: string;
  abstract: string;
  keywords: string;
  authors: string;
  primaryAuthorId?: string;
  manuscriptUrl?: string;
}) {
  try {
    const article = await prisma.journalArticle.create({
      data: {
        journalId: data.journalId,
        title: data.title,
        abstract: data.abstract,
        keywords: data.keywords,
        authors: data.authors,
        primaryAuthorId: data.primaryAuthorId || null,
        manuscriptUrl: data.manuscriptUrl || null,
        status: 'SUBMITTED',
      },
    });

    try {
      revalidatePath('/dashboard/tertiary/research');
    } catch {}

    return { success: true, data: sanitize(article) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function submitPeerReviewAction(data: {
  articleId: string;
  reviewerName: string;
  reviewerEmail?: string;
  originalityScore: number;
  methodologyScore: number;
  clarityScore: number;
  significanceScore: number;
  recommendation: 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT';
  confidentialComments?: string;
  authorComments?: string;
}) {
  try {
    const review = await prisma.journalPeerReview.create({
      data: {
        articleId: data.articleId,
        reviewerName: data.reviewerName,
        reviewerEmail: data.reviewerEmail || null,
        originalityScore: Number(data.originalityScore),
        methodologyScore: Number(data.methodologyScore),
        clarityScore: Number(data.clarityScore),
        significanceScore: Number(data.significanceScore),
        recommendation: data.recommendation,
        confidentialComments: data.confidentialComments || null,
        authorComments: data.authorComments || null,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Update article status based on editorial flow
    let newStatus = 'UNDER_PEER_REVIEW';
    if (data.recommendation === 'ACCEPT') newStatus = 'ACCEPTED';
    else if (data.recommendation === 'MINOR_REVISION' || data.recommendation === 'MAJOR_REVISION') newStatus = 'REVISION_REQUESTED';
    else if (data.recommendation === 'REJECT') newStatus = 'REJECTED';

    await prisma.journalArticle.update({
      where: { id: data.articleId },
      data: { status: newStatus },
    });

    try {
      revalidatePath('/dashboard/tertiary/research');
    } catch {}

    return { success: true, data: sanitize(review) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function publishArticleAction(data: {
  articleId: string;
  issueId: string;
  doi?: string;
  pages?: string;
  publishedPdfUrl?: string;
}) {
  try {
    const article = await prisma.journalArticle.update({
      where: { id: data.articleId },
      data: {
        issueId: data.issueId,
        doi: data.doi || `10.5281/zenodo.${Math.floor(1000000 + Math.random() * 9000000)}`,
        pages: data.pages || '1-16',
        publishedPdfUrl: data.publishedPdfUrl || null,
        status: 'PUBLISHED',
      },
    });

    try {
      revalidatePath('/dashboard/tertiary/research');
    } catch {}

    return { success: true, data: sanitize(article) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function generateCitationAction(articleId: string, style: 'APA' | 'IEEE' | 'HARVARD' | 'BIBTEX') {
  try {
    const article = await prisma.journalArticle.findUnique({
      where: { id: articleId },
      include: {
        journal: true,
        issue: true,
      },
    });

    if (!article) return { success: false, error: 'Article not found' };

    const year = article.issue?.publicationDate ? new Date(article.issue.publicationDate).getFullYear() : new Date(article.createdAt).getFullYear();
    const authors = article.authors;
    const vol = article.issue?.volume || 1;
    const num = article.issue?.issueNumber || 1;
    const pages = article.pages || '1-15';
    const doiStr = article.doi ? ` https://doi.org/${article.doi}` : '';

    let citation = '';
    switch (style) {
      case 'APA':
        citation = `${authors} (${year}). ${article.title}. ${article.journal.title}, ${vol}(${num}), ${pages}.${doiStr}`;
        break;
      case 'IEEE':
        citation = `${authors}, "${article.title}," ${article.journal.title}, vol. ${vol}, no. ${num}, pp. ${pages}, ${year}.${doiStr}`;
        break;
      case 'HARVARD':
        citation = `${authors}, ${year}. ${article.title}. ${article.journal.title}, ${vol}(${num}), pp.${pages}.${doiStr}`;
        break;
      case 'BIBTEX':
        const cleanKey = (article.doi || article.id).replace(/[^a-zA-Z0-9]/g, '');
        citation = `@article{${cleanKey},\n  author = {${authors}},\n  title = {${article.title}},\n  journal = {${article.journal.title}},\n  volume = {${vol}},\n  number = {${num}},\n  pages = {${pages}},\n  year = {${year}},\n  doi = {${article.doi || ''}}\n}`;
        break;
    }

    return { success: true, citation, style };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==============================================================================
// 3. UNIVERSITY BULLETINS & GAZETTES ACTIONS
// ==============================================================================

export async function getUniversityBulletinsAction(filters?: {
  type?: string;
  status?: string;
  search?: string;
}) {
  try {
    const where: any = {};
    if (filters?.type && filters.type !== 'ALL') {
      where.bulletinType = filters.type;
    }
    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { summary: { contains: filters.search } },
        { publishedBy: { contains: filters.search } },
      ];
    }

    let bulletins = await prisma.universityBulletin.findMany({
      where,
      orderBy: [{ isUrgent: 'desc' }, { publicationDate: 'desc' }],
    });

    if (bulletins.length === 0 && (!filters || Object.keys(filters).length === 0)) {
      await seedDefaultJournalsAndBulletins();
      bulletins = await prisma.universityBulletin.findMany({
        orderBy: [{ isUrgent: 'desc' }, { publicationDate: 'desc' }],
      });
    }

    return { success: true, data: sanitize(bulletins) };
  } catch (err: any) {
    console.error('getUniversityBulletinsAction error:', err);
    return { success: false, error: err.message };
  }
}

export async function createUniversityBulletinAction(data: {
  title: string;
  bulletinType: string;
  volume: number;
  issueNumber: number;
  summary: string;
  content: string;
  publishedBy?: string;
  editorInChief?: string;
  pdfUrl?: string;
  coverUrl?: string;
  targetAudience?: string;
  isUrgent?: boolean;
  isFeatured?: boolean;
}) {
  try {
    const bulletin = await prisma.universityBulletin.create({
      data: {
        title: data.title,
        bulletinType: data.bulletinType,
        volume: Number(data.volume),
        issueNumber: Number(data.issueNumber),
        summary: data.summary,
        content: data.content,
        publishedBy: data.publishedBy || 'Directorate of Information & Protocol (DIPR)',
        editorInChief: data.editorInChief || 'University Registrar',
        pdfUrl: data.pdfUrl || null,
        coverUrl: data.coverUrl || null,
        targetAudience: data.targetAudience || 'ALL',
        isUrgent: data.isUrgent ?? false,
        isFeatured: data.isFeatured ?? false,
        status: 'PUBLISHED',
        approvedBy: 'Office of the Vice-Chancellor',
        approvedAt: new Date(),
      },
    });

    try {
      revalidatePath('/dashboard/tertiary/bulletins');
      revalidatePath('/dashboard/tertiary/student-hub');
    } catch {}

    return { success: true, data: sanitize(bulletin) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function incrementBulletinViewCountAction(id: string) {
  try {
    await prisma.universityBulletin.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==============================================================================
// 4. SEED SAMPLE DATA FOR IMMEDIATE USE
// ==============================================================================

async function seedDefaultJournalsAndBulletins() {
  try {
    // 1. Seed Journals
    const j1 = await prisma.academicJournal.upsert({
      where: { code: 'PJSC' },
      update: {},
      create: {
        title: 'Proxima Journal of Science, Computing & Informatics',
        code: 'PJSC',
        issn: '2736-1047',
        eIssn: '2736-1055',
        description: 'A premier double-blind peer-reviewed international quarterly journal publishing high-impact discoveries across computer science, software engineering, artificial intelligence, and applied computational mathematics.',
        scopeAndAim: 'Welcomes fundamental and applied original research papers, reviews, and industrial technical reports. Indexed across DOAJ, Google Scholar, and indexed in regional institutional repositories.',
        faculty: 'Faculty of Science & Computing',
        department: 'Computer Science',
        editorInChief: 'Prof. Aliyu Sani, Ph.D. (Chair of AI & Distributed Systems)',
        status: 'ACTIVE',
      },
    });

    const j2 = await prisma.academicJournal.upsert({
      where: { code: 'JEMS' },
      update: {},
      create: {
        title: 'Journal of Engineering, Manufacturing & Renewable Energy',
        code: 'JEMS',
        issn: '2814-2201',
        eIssn: '2814-221X',
        description: 'Bi-annual scholarly journal publishing interdisciplinary research in electrical machines, embedded IoT systems, smart grid dynamics, and mechanical modeling.',
        faculty: 'Faculty of Engineering & Technology',
        department: 'Electrical & Electronic Engineering',
        editorInChief: 'Engr. Prof. Maryam Bello, FNSE',
        status: 'ACTIVE',
      },
    });

    // Seed Issues for J1
    const issue1 = await prisma.journalIssue.upsert({
      where: {
        journalId_volume_issueNumber: {
          journalId: j1.id,
          volume: 4,
          issueNumber: 2,
        },
      },
      update: {},
      create: {
        journalId: j1.id,
        volume: 4,
        issueNumber: 2,
        title: 'Vol. 4 No. 2 (2026): Special Issue on Distributed Consensus & Edge AI',
        publicationDate: new Date('2026-09-15'),
        status: 'PUBLISHED',
      },
    });

    // Seed Articles
    const countArticles = await prisma.journalArticle.count({ where: { journalId: j1.id } });
    if (countArticles === 0) {
      await prisma.journalArticle.createMany({
        data: [
          {
            journalId: j1.id,
            issueId: issue1.id,
            title: 'Fault-Tolerant Distributed Byzantine Agreement in Low-Bandwidth Sub-Saharan Campus Networks',
            abstract: 'In distributed enterprise education systems, transient network partitions and fluctuating satellite links introduce severe synchronization bottlenecks during continuous assessment grading. In this paper, we propose a lightweight quorum-adaptive Byzantine consensus protocol tailored for university campus cloud backbones. Experimental evaluation across 10,000 simulated student nodes indicates a 42% decrease in latency and complete immunity to stale-state injection.',
            keywords: 'Byzantine Fault Tolerance, Distributed Systems, Campus Network Architecture, Next.js Edge Runtime',
            authors: 'Dr. Usman Danfulani, Engr. Fatima Kabir, Prof. Aliyu Sani',
            doi: '10.5281/zenodo.10829141',
            pages: '12-28',
            citationsCount: 14,
            downloadsCount: 382,
            viewsCount: 1205,
            status: 'PUBLISHED',
          },
          {
            journalId: j1.id,
            issueId: issue1.id,
            title: 'Automated Academic Integrity Telemetry: Keystroke Velocity and Head-Pose Tracking in High-Stakes Remote CBT',
            abstract: 'Online continuous examinations demand zero-trust telemetry without violating examinee privacy. We demonstrate a privacy-preserving WebAssembly inference pipeline running entirely client-side. The system detects anomalous tab-switching, non-human paste bursts, and secondary-screen gaze angles with 98.4% precision while transferring zero video streams off the local device.',
            keywords: 'Computer-Based Testing, Academic Integrity, Client-Side AI, WebAssembly, Telemetry',
            authors: 'Amina Bello, Prof. Ibrahim Danbatta',
            doi: '10.5281/zenodo.10829142',
            pages: '29-44',
            citationsCount: 22,
            downloadsCount: 512,
            viewsCount: 1840,
            status: 'PUBLISHED',
          },
          {
            journalId: j1.id,
            title: 'Comparative Cryptographic Verification of University Degree Transcripts Using Merkle Trees and Offline QR Tokens',
            abstract: 'Degree fraud and slow transcript verification remain crippling pain points in tertiary administration. We present an offline HMAC-SHA256 signature architecture integrated into 2D Aztec and QR codes that allows embassies and employers to verify transcripts without network access to the origin database.',
            keywords: 'Credential Verification, Degree Fraud, Cryptographic Tokens, Aztec Matrix',
            authors: 'Engr. Mustapha Haruna, Dr. Aliyu Sani',
            status: 'UNDER_PEER_REVIEW',
          },
        ],
      });
    }

    // 2. Seed University Bulletins
    const countBulletins = await prisma.universityBulletin.count();
    if (countBulletins === 0) {
      await prisma.universityBulletin.createMany({
        data: [
          {
            title: 'Official Information Bulletin No. 428: Decisions of the 184th Regular Senate Meeting',
            bulletinType: 'SENATE_COMMUNIQUE',
            volume: 12,
            issueNumber: 4,
            publicationDate: new Date('2026-10-25'),
            publishedBy: 'Directorate of Information & Protocol (DIPR)',
            editorInChief: 'University Registrar & Secretary to Senate',
            summary: 'The University Senate at its 184th Regular Meeting considered broadsheet submissions, approved the updated 2026/2027 Academic Calendar, and ratified guidelines for anonymous continuous assessment and degree clearance.',
            content: `### 1. APPROVAL OF 2026/2027 ACADEMIC CALENDAR
The Senate unanimously ratified the adjusted academic calendar for the First and Second Semesters of the 2026/2027 Session. Key dates:
- **Resumption & Course Registration:** Monday, 10th November 2026
- **Late Registration Surcharge Closes:** Friday, 28th November 2026
- **Mid-Semester Assessments:** Week 7 (14th - 19th December 2026)
- **First Semester Examinations Commence:** Monday, 1st February 2027

### 2. ANONYMOUS EXAM GRADING & DOUBLE-BLIND ASSESSMENTS
In line with NUC benchmark quality assurance policies, all Faculties must strictly deploy the TIMS Anonymous Exam Grading module. Student matriculation numbers must remain masked on exam scripts and substituted with randomized encrypted docket tokens.

### 3. MANDATORY RESEARCH REPOSITORY SUBMISSION
All final-year undergraduate theses and postgraduate dissertations must be deposited in the University e-Library & Institutional Research Repository prior to final Senate clearance.`,
            targetAudience: 'ALL',
            isUrgent: false,
            isFeatured: true,
            viewCount: 3410,
            status: 'PUBLISHED',
            approvedBy: 'Senate Secretariat',
            approvedAt: new Date('2026-10-25'),
          },
          {
            title: 'Executive Notice: 2026/2027 Hostel Bedspace Allocation & Hall Warden Clearance Protocols',
            bulletinType: 'OFFICIAL_BULLETIN',
            volume: 12,
            issueNumber: 5,
            publicationDate: new Date('2026-10-28'),
            publishedBy: 'Student Affairs Division & Directorate of Residence',
            editorInChief: 'Dean of Student Affairs',
            summary: 'Eligible undergraduate students cleared by the Bursary are advised that bedspace reservation across Hall A, Hall B, and Queen Amina Hall is now open online via the TIMS Student Hub.',
            content: `The Student Affairs Division announces the commencement of online bedspace booking for the 2026/2027 academic session.

### ELIGIBILITY & GUIDELINES:
1. Students must have finalized tuition payment or possessed approved Bursary installment clearance.
2. Direct room selection is conducted through the **Hostel Accommodation** module on the TIMS portal.
3. Printed allocation slips with verified QR codes must be presented to Hall Porters within 5 working days of resumption for key collection.
4. Squatting, room-selling, and unauthorized electrical heating devices are strictly prohibited and attract immediate expulsion from the Halls of Residence.`,
            targetAudience: 'STUDENTS_ONLY',
            isUrgent: true,
            isFeatured: true,
            viewCount: 4890,
            status: 'PUBLISHED',
            approvedBy: 'Dean of Student Affairs',
            approvedAt: new Date('2026-10-28'),
          },
          {
            title: 'Research Call: Call for Papers for Vol. 5 No. 1 of the Proxima Journal of Science & Computing',
            bulletinType: 'RESEARCH_BRIEF',
            volume: 12,
            issueNumber: 6,
            publicationDate: new Date('2026-10-30'),
            publishedBy: 'University Research & Publication Committee (URPC)',
            editorInChief: 'Director of Research & Innovation',
            summary: 'The Editorial Board invites original empirical and theoretical manuscripts for publication in the upcoming indexed issue. Submissions are accepted directly through the TIMS Journal Publishing Desk.',
            content: `The University Research & Publication Committee announces a Call for Papers for the forthcoming edition of the **Proxima Journal of Science, Computing & Informatics (PJSC)**.

### SUBMISSION TRACKS:
- Artificial Intelligence & Machine Learning in Developing Economies
- Renewable Energy Systems & Micro-Grid Automation
- Cryptographic Architectures for Digital Governance
- Educational Technologies & Automated Continuous Assessment

**Submission Deadline:** 15th December 2026  
**Notification of Peer Review Decision:** 10th January 2027  
**Publication Date:** 1st February 2027

All manuscripts undergo double-blind peer review and receive a registered DOI upon acceptance. Submit online via the **Research & Journal Publishing Desk** in TIMS.`,
            targetAudience: 'FACULTY_ONLY',
            isUrgent: false,
            isFeatured: false,
            viewCount: 1650,
            status: 'PUBLISHED',
            approvedBy: 'Director of Research',
            approvedAt: new Date('2026-10-30'),
          },
        ],
      });
    }

    console.log('Seeded sample Academic Journals and University Bulletins successfully.');
  } catch (err: any) {
    console.error('Error seeding journals/bulletins:', err);
  }
}
