'use client';

import { forwardRef } from 'react';

type MidtermResult = {
    subjectName: string;
    score: number;
    achievement: string;
};

type PrintableMidtermCardProps = {
    student: {
        firstName: string;
        lastName: string;
        studentId: string;
        classLevel: string;
    };
    results: MidtermResult[];
    term: string;
    session: string;
    averageScore: number;
    headerImage?: string;
    signatureImage?: string;
    watermarkImage?: string;
};

const PrintableMidtermCard = forwardRef<HTMLDivElement, PrintableMidtermCardProps>(
    ({ student, results, term, session, averageScore, headerImage, signatureImage, watermarkImage }, ref) => {
        const getOverallEffort = (avg: number) => {
            if (avg >= 0 && avg < 6) return 'Emerging (Need Support)';
            if (avg >= 6 && avg < 9) return 'Emerging + (Satisfactory)';
            if (avg >= 9 && avg < 13) return 'Expected (Good)';
            if (avg >= 13 && avg < 17) return 'Expected + (Very Good)';
            if (avg >= 17 && avg <= 20) return 'Exceeding (Excellent)';
            return 'Invalid Score';
        };

        return (
            <div ref={ref} className="bg-white p-8 relative">
                <style jsx>{`
                    @media print {
                        @page {
                            size: A4;
                            margin: 20mm;
                        }
                        body {
                            -webkit-print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }
                    }
                `}</style>

                {/* Watermark */}
                {watermarkImage && (
                    <div 
                        className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none"
                        style={{
                            backgroundImage: `url(${watermarkImage})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            backgroundSize: '60%'
                        }}
                    />
                )}

                <div className="relative z-10">
                    <table className="w-full border-collapse border border-black text-[10px]">
                        {/* Header Image */}
                        <thead>
                            <tr>
                                <th colSpan={14} className="border border-black text-center p-2">
                                    {headerImage && (
                                        <img src={headerImage} alt="School Header" className="w-4/5 mx-auto" />
                                    )}
                                </th>
                            </tr>
                        </thead>

                        {/* Title */}
                        <thead>
                            <tr>
                                <th colSpan={14} className="border border-black text-center p-2">
                                    <h1 className="text-lg font-bold">STUDENT PROGRESS REPORT</h1>
                                </th>
                            </tr>
                        </thead>

                        {/* Student Information Header */}
                        <thead>
                            <tr>
                                <th colSpan={14} className="border border-black text-center p-2 font-bold">
                                    STUDENT INFORMATION
                                </th>
                            </tr>
                        </thead>

                        {/* Student Details */}
                        <tbody>
                            <tr>
                                <th className="border border-black p-2">Student Name</th>
                                <td colSpan={9} className="border border-black p-2">
                                    {student.firstName} {student.lastName} [{student.studentId}]
                                </td>
                                <th className="border border-black p-2">Term</th>
                                <td colSpan={3} className="border border-black p-2">{term}</td>
                            </tr>
                            <tr>
                                <th className="border border-black p-2">Current Class</th>
                                <td colSpan={9} className="border border-black p-2">{student.classLevel}</td>
                                <th className="border border-black p-2">Session</th>
                                <td colSpan={3} className="border border-black p-2">{session}</td>
                            </tr>
                        </tbody>

                        {/* Results Header */}
                        <thead>
                            <tr>
                                <th colSpan={14} className="border border-black p-1"></th>
                            </tr>
                            <tr>
                                <th colSpan={4} className="border border-black p-2 font-bold">SUBJECT</th>
                                <th colSpan={5} className="border border-black p-2 text-center font-bold">EFFORTS</th>
                                <th colSpan={3} className="border border-black p-2 font-bold">ACHIEVEMENT</th>
                            </tr>
                            <tr>
                                <th colSpan={4} className="border border-black p-2"></th>
                                <th className="border border-black p-2 text-center" style={{ backgroundColor: '#da3d3d', color: 'white' }}>
                                    EMERGING
                                </th>
                                <th className="border border-black p-2 text-center" style={{ backgroundColor: '#f5b85d' }}>
                                    EMERGING +
                                </th>
                                <th className="border border-black p-2 text-center" style={{ backgroundColor: '#f0e36f' }}>
                                    EXPECTED
                                </th>
                                <th className="border border-black p-2 text-center" style={{ backgroundColor: '#93da42' }}>
                                    EXPECTED +
                                </th>
                                <th className="border border-black p-2 text-center" style={{ backgroundColor: '#46af4b', color: 'white' }}>
                                    EXCEEDING
                                </th>
                                <th colSpan={3} className="border border-black p-2"></th>
                            </tr>
                        </thead>

                        {/* Results */}
                        <tbody>
                            {results.map((result, index) => (
                                <tr key={index}>
                                    <td colSpan={4} className="border border-black p-2">{result.subjectName}</td>
                                    <td className="border border-black p-2 text-center font-bold text-green-600">
                                        {result.score >= 0 && result.score <= 6 ? '✔️' : ''}
                                    </td>
                                    <td className="border border-black p-2 text-center font-bold text-green-600">
                                        {result.score >= 7 && result.score <= 9 ? '✔️' : ''}
                                    </td>
                                    <td className="border border-black p-2 text-center font-bold text-green-600">
                                        {result.score >= 10 && result.score <= 12 ? '✔️' : ''}
                                    </td>
                                    <td className="border border-black p-2 text-center font-bold text-green-600">
                                        {result.score >= 13 && result.score <= 16 ? '✔️' : ''}
                                    </td>
                                    <td className="border border-black p-2 text-center font-bold text-green-600">
                                        {result.score >= 17 && result.score <= 20 ? '✔️' : ''}
                                    </td>
                                    <td colSpan={3} className="border border-black p-2">{result.achievement}</td>
                                </tr>
                            ))}
                        </tbody>

                        {/* Key */}
                        <thead>
                            <tr>
                                <th colSpan={14} className="border border-black p-2 text-center font-bold">
                                    KEY: Emerging = 0 - 6, Emerging + = 7 - 9, Expected = 10 - 12, Expected + = 13 - 16, Exceeding = 17 - 20
                                </th>
                            </tr>
                        </thead>

                        {/* Overall Effort */}
                        <thead>
                            <tr>
                                <th colSpan={14} className="border border-black p-2 text-center font-bold text-sm">
                                    Overall Effort: {getOverallEffort(averageScore)}
                                </th>
                            </tr>
                        </thead>

                        {/* Signature */}
                        <thead>
                            <tr>
                                <th colSpan={8} className="border border-black p-2 text-center">
                                    Head of School's Signature
                                </th>
                                <td colSpan={8} className="border border-black p-2 text-center">
                                    {signatureImage && (
                                        <img src={signatureImage} alt="Signature" className="w-32 mx-auto" />
                                    )}
                                </td>
                            </tr>
                        </thead>
                    </table>
                </div>
            </div>
        );
    }
);

PrintableMidtermCard.displayName = 'PrintableMidtermCard';

export default PrintableMidtermCard;
