export type AccreditationStandard = 'US_4_0' | 'UK_HONOURS' | 'NIGERIA_NUC_5_0';

export interface GradeResult {
  letterGrade: string;
  gradePoint: number;
  isPassing: boolean;
  remarks?: string;
}

export interface DegreeStandingResult {
  gpa: number;
  cgpa: number;
  totalCreditsAttempted: number;
  totalCreditsEarned: number;
  standing: 'GOOD_STANDING' | 'PROBATION' | 'WITHDRAWN';
  degreeClassification?: string;
  honoursClass?: string;
  isProbationTriggered: boolean;
}

export interface CourseScoreItem {
  code: string;
  creditUnits: number;
  totalScore: number;
  level?: number;
}

export interface IGradingStrategy {
  calculateGrade(score: number): GradeResult;
  calculateGPA(courses: CourseScoreItem[]): { gpa: number; totalCreditsEarned: number; totalCreditsAttempted: number };
  calculateStanding(cgpa: number, semesterCount: number): DegreeStandingResult;
}

/**
 * 1. US Standard 4.00 Scale Strategy
 * Supports standard A-F scale + Latin Honours
 */
export class USGradingStrategy implements IGradingStrategy {
  calculateGrade(score: number): GradeResult {
    const s = Math.round(score * 10) / 10;
    if (s >= 93) return { letterGrade: 'A', gradePoint: 4.0, isPassing: true, remarks: 'Excellent' };
    if (s >= 90) return { letterGrade: 'A-', gradePoint: 3.7, isPassing: true, remarks: 'Superior' };
    if (s >= 87) return { letterGrade: 'B+', gradePoint: 3.3, isPassing: true, remarks: 'Very Good' };
    if (s >= 83) return { letterGrade: 'B', gradePoint: 3.0, isPassing: true, remarks: 'Good' };
    if (s >= 80) return { letterGrade: 'B-', gradePoint: 2.7, isPassing: true, remarks: 'Above Average' };
    if (s >= 77) return { letterGrade: 'C+', gradePoint: 2.3, isPassing: true, remarks: 'Average' };
    if (s >= 73) return { letterGrade: 'C', gradePoint: 2.0, isPassing: true, remarks: 'Satisfactory' };
    if (s >= 70) return { letterGrade: 'C-', gradePoint: 1.7, isPassing: true, remarks: 'Below Average' };
    if (s >= 67) return { letterGrade: 'D+', gradePoint: 1.3, isPassing: true, remarks: 'Poor' };
    if (s >= 60) return { letterGrade: 'D', gradePoint: 1.0, isPassing: true, remarks: 'Barely Passing' };
    return { letterGrade: 'F', gradePoint: 0.0, isPassing: false, remarks: 'Failing' };
  }

  calculateGPA(courses: CourseScoreItem[]) {
    let totalQualityPoints = 0;
    let totalCreditsAttempted = 0;
    let totalCreditsEarned = 0;

    for (const c of courses) {
      const g = this.calculateGrade(c.totalScore);
      totalQualityPoints += g.gradePoint * c.creditUnits;
      totalCreditsAttempted += c.creditUnits;
      if (g.isPassing) {
        totalCreditsEarned += c.creditUnits;
      }
    }

    const gpa = totalCreditsAttempted > 0 ? Number((totalQualityPoints / totalCreditsAttempted).toFixed(3)) : 0;
    return { gpa, totalCreditsAttempted, totalCreditsEarned };
  }

  calculateStanding(cgpa: number, _semesterCount: number): DegreeStandingResult {
    let standing: 'GOOD_STANDING' | 'PROBATION' | 'WITHDRAWN' = 'GOOD_STANDING';
    let honoursClass = 'Standard';

    if (cgpa < 2.0) {
      standing = cgpa < 1.0 ? 'WITHDRAWN' : 'PROBATION';
    }

    if (cgpa >= 3.9) {
      honoursClass = 'Summa Cum Laude';
    } else if (cgpa >= 3.7) {
      honoursClass = 'Magna Cum Laude';
    } else if (cgpa >= 3.5) {
      honoursClass = 'Cum Laude';
    }

    return {
      gpa: cgpa,
      cgpa,
      totalCreditsAttempted: 0,
      totalCreditsEarned: 0,
      standing,
      degreeClassification: honoursClass,
      honoursClass,
      isProbationTriggered: standing === 'PROBATION',
    };
  }
}

/**
 * 2. UK Honours Framework Strategy
 * 1st Class (>= 70%), 2:1 (60-69%), 2:2 (50-59%), 3rd Class (40-49%), Fail (< 40%)
 * Level 5 weighted at 33.3%, Level 6 at 66.7%
 */
export class UKHonoursGradingStrategy implements IGradingStrategy {
  calculateGrade(score: number): GradeResult {
    const s = Math.round(score * 10) / 10;
    if (s >= 70) return { letterGrade: '1st', gradePoint: 4.0, isPassing: true, remarks: 'First Class' };
    if (s >= 60) return { letterGrade: '2:1', gradePoint: 3.3, isPassing: true, remarks: 'Upper Second Class' };
    if (s >= 50) return { letterGrade: '2:2', gradePoint: 2.7, isPassing: true, remarks: 'Lower Second Class' };
    if (s >= 40) return { letterGrade: '3rd', gradePoint: 2.0, isPassing: true, remarks: 'Third Class' };
    return { letterGrade: 'Fail', gradePoint: 0.0, isPassing: false, remarks: 'Fail' };
  }

  calculateGPA(courses: CourseScoreItem[]) {
    let totalScoreWeighted = 0;
    let totalWeights = 0;
    let totalCreditsAttempted = 0;
    let totalCreditsEarned = 0;

    for (const c of courses) {
      let multiplier = 1;
      if (c.level === 200 || c.level === 300) multiplier = 0.333; // Level 5
      if (c.level === 400 || c.level === 500) multiplier = 0.667; // Level 6

      const weight = c.creditUnits * multiplier;
      totalScoreWeighted += c.totalScore * weight;
      totalWeights += weight;
      totalCreditsAttempted += c.creditUnits;

      if (c.totalScore >= 40) {
        totalCreditsEarned += c.creditUnits;
      }
    }

    const gpa = totalWeights > 0 ? Number((totalScoreWeighted / totalWeights).toFixed(2)) : 0;
    return { gpa, totalCreditsAttempted, totalCreditsEarned };
  }

  calculateStanding(cgpaScore: number, _semesterCount: number): DegreeStandingResult {
    let classification = 'Fail';
    let standing: 'GOOD_STANDING' | 'PROBATION' | 'WITHDRAWN' = 'GOOD_STANDING';

    if (cgpaScore >= 70) {
      classification = 'First Class Honours (1st)';
    } else if (cgpaScore >= 60) {
      classification = 'Second Class Honours, Upper Division (2:1)';
    } else if (cgpaScore >= 50) {
      classification = 'Second Class Honours, Lower Division (2:2)';
    } else if (cgpaScore >= 40) {
      classification = 'Third Class Honours (3rd)';
    } else {
      standing = cgpaScore < 30 ? 'WITHDRAWN' : 'PROBATION';
    }

    return {
      gpa: cgpaScore,
      cgpa: cgpaScore,
      totalCreditsAttempted: 0,
      totalCreditsEarned: 0,
      standing,
      degreeClassification: classification,
      honoursClass: classification,
      isProbationTriggered: standing === 'PROBATION',
    };
  }
}

/**
 * 3. Nigerian NUC BMAS / CCMAS 5.00 Scale Strategy
 * A (5.00, 70-100%), B (4.00, 60-69%), C (3.00, 50-59%), D (2.00, 45-49%), F (0.00, < 45%)
 * Classifications: 1st Class (4.50-5.00), 2nd Upper (3.50-4.49), 2nd Lower (2.40-3.49), 3rd Class (1.50-2.39).
 * Automatic probation if CGPA < 1.50.
 */
export class NigeriaNUCGradingStrategy implements IGradingStrategy {
  calculateGrade(score: number): GradeResult {
    const s = Math.round(score * 10) / 10;
    if (s >= 70) return { letterGrade: 'A', gradePoint: 5.0, isPassing: true, remarks: 'Excellent' };
    if (s >= 60) return { letterGrade: 'B', gradePoint: 4.0, isPassing: true, remarks: 'Very Good' };
    if (s >= 50) return { letterGrade: 'C', gradePoint: 3.0, isPassing: true, remarks: 'Good' };
    if (s >= 45) return { letterGrade: 'D', gradePoint: 2.0, isPassing: true, remarks: 'Fair' };
    return { letterGrade: 'F', gradePoint: 0.0, isPassing: false, remarks: 'Fail' };
  }

  calculateGPA(courses: CourseScoreItem[]) {
    let totalQualityPoints = 0;
    let totalCreditsAttempted = 0;
    let totalCreditsEarned = 0;

    for (const c of courses) {
      const g = this.calculateGrade(c.totalScore);
      totalQualityPoints += g.gradePoint * c.creditUnits;
      totalCreditsAttempted += c.creditUnits;
      if (g.isPassing) {
        totalCreditsEarned += c.creditUnits;
      }
    }

    const gpa = totalCreditsAttempted > 0 ? Number((totalQualityPoints / totalCreditsAttempted).toFixed(3)) : 0;
    return { gpa, totalCreditsAttempted, totalCreditsEarned };
  }

  calculateStanding(cgpa: number, _semesterCount: number): DegreeStandingResult {
    let degreeClassification = 'Fail';
    let standing: 'GOOD_STANDING' | 'PROBATION' | 'WITHDRAWN' = 'GOOD_STANDING';

    if (cgpa >= 4.5) {
      degreeClassification = 'First Class Honours';
    } else if (cgpa >= 3.5) {
      degreeClassification = 'Second Class Honours (Upper Division)';
    } else if (cgpa >= 2.4) {
      degreeClassification = 'Second Class Honours (Lower Division)';
    } else if (cgpa >= 1.5) {
      degreeClassification = 'Third Class Honours';
    } else {
      standing = cgpa < 1.0 ? 'WITHDRAWN' : 'PROBATION';
      degreeClassification = 'Probation / Unsatisfactory';
    }

    return {
      gpa: cgpa,
      cgpa,
      totalCreditsAttempted: 0,
      totalCreditsEarned: 0,
      standing,
      degreeClassification,
      honoursClass: degreeClassification,
      isProbationTriggered: cgpa < 1.5,
    };
  }
}

/**
 * Unified Context Factory for Multi-Accreditation Grading
 */
export class GradingEngine {
  private strategy: IGradingStrategy;

  constructor(standard: AccreditationStandard = 'NIGERIA_NUC_5_0') {
    switch (standard) {
      case 'US_4_0':
        this.strategy = new USGradingStrategy();
        break;
      case 'UK_HONOURS':
        this.strategy = new UKHonoursGradingStrategy();
        break;
      case 'NIGERIA_NUC_5_0':
      default:
        this.strategy = new NigeriaNUCGradingStrategy();
        break;
    }
  }

  calculateGrade(score: number): GradeResult {
    return this.strategy.calculateGrade(score);
  }

  calculateGPA(courses: CourseScoreItem[]) {
    return this.strategy.calculateGPA(courses);
  }

  calculateStanding(cgpa: number, semesterCount: number = 1): DegreeStandingResult {
    return this.strategy.calculateStanding(cgpa, semesterCount);
  }
}
