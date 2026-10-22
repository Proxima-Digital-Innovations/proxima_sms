'use client';

import { useState } from 'react';
import { admitStudent, generateNextStudentId } from '@/actions/student-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function AdmissionsPage() {
    const [step, setStep] = useState(1);
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [studentData, setStudentData] = useState({
        firstName: '',
        lastName: '',
        middleName: '',
        gender: '',
        dateOfBirth: '',
        classLevel: '',
        sessionYear: '2024/2025'
    });

    const [guardianData, setGuardianData] = useState({
        fullName: '',
        relationship: '',
        phone: '',
        email: '',
        address: '',
        occupation: ''
    });

    const [healthData, setHealthData] = useState({
        bloodGroup: '',
        genotype: '',
        allergies: '',
        medicalConditions: ''
    });

    const generateStudentId = async () => {
        return await generateNextStudentId();
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const studentId = await generateStudentId();
            
            const payload = {
                firstName: studentData.firstName,
                lastName: studentData.lastName,
                middleName: studentData.middleName || '',
                gender: studentData.gender,
                dateOfBirth: studentData.dateOfBirth,
                classId: studentData.classLevel, // Using classLevel as classId placeholder
                studentId,
                guardianFullName: guardianData.fullName,
                guardianRelationship: guardianData.relationship,
                guardianPhone: guardianData.phone,
                guardianEmail: guardianData.email,
                guardianAddress: guardianData.address,
                sessionYear: studentData.sessionYear
            };

            const response = await admitStudent(payload);
            if (!response.success) {
                throw new Error(response.error);
            }

            toast({
                title: 'Success!',
                description: `Student admitted successfully with ID: ${studentId}`
            });

            // Reset form
            setStudentData({
                firstName: '',
                lastName: '',
                middleName: '',
                gender: '',
                dateOfBirth: '',
                classLevel: '',
                sessionYear: '2024/2025'
            });
            setGuardianData({
                fullName: '',
                relationship: '',
                phone: '',
                email: '',
                address: '',
                occupation: ''
            });
            setHealthData({
                bloodGroup: '',
                genotype: '',
                allergies: '',
                medicalConditions: ''
            });
            setStep(1);
        } catch (error) {
            console.error('Error admitting student:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to admit student. Please try again.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const canProceedStep1 = studentData.firstName && studentData.lastName && studentData.gender && studentData.dateOfBirth && studentData.classLevel;
    const canProceedStep2 = guardianData.fullName && guardianData.relationship && guardianData.phone && guardianData.address;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <UserPlus className="h-8 w-8" />
                    Student Admissions
                </h1>
                <p className="text-muted-foreground">Register new students into the school system</p>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-center gap-2">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step >= s ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground text-muted-foreground'}`}>
                            {step > s ? <Check className="h-5 w-5" /> : s}
                        </div>
                        {s < 3 && <div className={`w-16 h-1 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
                    </div>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {step === 1 && 'Student Information'}
                        {step === 2 && 'Guardian Information'}
                        {step === 3 && 'Health Information'}
                    </CardTitle>
                    <CardDescription>
                        {step === 1 && 'Enter the student\'s personal details'}
                        {step === 2 && 'Enter the primary guardian\'s information'}
                        {step === 3 && 'Enter health and medical information'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Step 1: Student Info */}
                    {step === 1 && (
                        <>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="firstName">First Name *</Label>
                                    <Input
                                        id="firstName"
                                        value={studentData.firstName}
                                        onChange={(e) => setStudentData({ ...studentData, firstName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="lastName">Last Name *</Label>
                                    <Input
                                        id="lastName"
                                        value={studentData.lastName}
                                        onChange={(e) => setStudentData({ ...studentData, lastName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="middleName">Middle Name</Label>
                                    <Input
                                        id="middleName"
                                        value={studentData.middleName}
                                        onChange={(e) => setStudentData({ ...studentData, middleName: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="gender">Gender *</Label>
                                    <Select value={studentData.gender} onValueChange={(value) => setStudentData({ ...studentData, gender: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="dob">Date of Birth *</Label>
                                    <Input
                                        id="dob"
                                        type="date"
                                        value={studentData.dateOfBirth}
                                        onChange={(e) => setStudentData({ ...studentData, dateOfBirth: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="class">Class Level *</Label>
                                    <Select value={studentData.classLevel} onValueChange={(value) => setStudentData({ ...studentData, classLevel: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select class" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Nursery 1">Nursery 1</SelectItem>
                                            <SelectItem value="Nursery 2">Nursery 2</SelectItem>
                                            <SelectItem value="KG 1">KG 1</SelectItem>
                                            <SelectItem value="KG 2">KG 2</SelectItem>
                                            <SelectItem value="Primary 1">Primary 1</SelectItem>
                                            <SelectItem value="Primary 2">Primary 2</SelectItem>
                                            <SelectItem value="Primary 3">Primary 3</SelectItem>
                                            <SelectItem value="Primary 4">Primary 4</SelectItem>
                                            <SelectItem value="Primary 5">Primary 5</SelectItem>
                                            <SelectItem value="Primary 6">Primary 6</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="session">Session Year *</Label>
                                    <Input
                                        id="session"
                                        value={studentData.sessionYear}
                                        onChange={(e) => setStudentData({ ...studentData, sessionYear: e.target.value })}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Step 2: Guardian Info */}
                    {step === 2 && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="guardianName">Full Name *</Label>
                                    <Input
                                        id="guardianName"
                                        value={guardianData.fullName}
                                        onChange={(e) => setGuardianData({ ...guardianData, fullName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="relationship">Relationship *</Label>
                                    <Select value={guardianData.relationship} onValueChange={(value) => setGuardianData({ ...guardianData, relationship: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select relationship" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Father">Father</SelectItem>
                                            <SelectItem value="Mother">Mother</SelectItem>
                                            <SelectItem value="Guardian">Guardian</SelectItem>
                                            <SelectItem value="Uncle">Uncle</SelectItem>
                                            <SelectItem value="Aunt">Aunt</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="phone">Phone Number *</Label>
                                    <Input
                                        id="phone"
                                        value={guardianData.phone}
                                        onChange={(e) => setGuardianData({ ...guardianData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={guardianData.email}
                                        onChange={(e) => setGuardianData({ ...guardianData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="occupation">Occupation</Label>
                                <Input
                                    id="occupation"
                                    value={guardianData.occupation}
                                    onChange={(e) => setGuardianData({ ...guardianData, occupation: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="address">Address *</Label>
                                <Textarea
                                    id="address"
                                    value={guardianData.address}
                                    onChange={(e) => setGuardianData({ ...guardianData, address: e.target.value })}
                                />
                            </div>
                        </>
                    )}

                    {/* Step 3: Health Info */}
                    {step === 3 && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="bloodGroup">Blood Group</Label>
                                    <Select value={healthData.bloodGroup} onValueChange={(value) => setHealthData({ ...healthData, bloodGroup: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select blood group" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A+">A+</SelectItem>
                                            <SelectItem value="A-">A-</SelectItem>
                                            <SelectItem value="B+">B+</SelectItem>
                                            <SelectItem value="B-">B-</SelectItem>
                                            <SelectItem value="AB+">AB+</SelectItem>
                                            <SelectItem value="AB-">AB-</SelectItem>
                                            <SelectItem value="O+">O+</SelectItem>
                                            <SelectItem value="O-">O-</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="genotype">Genotype</Label>
                                    <Select value={healthData.genotype} onValueChange={(value) => setHealthData({ ...healthData, genotype: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select genotype" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AA">AA</SelectItem>
                                            <SelectItem value="AS">AS</SelectItem>
                                            <SelectItem value="SS">SS</SelectItem>
                                            <SelectItem value="AC">AC</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="allergies">Allergies</Label>
                                <Textarea
                                    id="allergies"
                                    value={healthData.allergies}
                                    onChange={(e) => setHealthData({ ...healthData, allergies: e.target.value })}
                                    placeholder="List any known allergies"
                                />
                            </div>
                            <div>
                                <Label htmlFor="medical">Medical Conditions</Label>
                                <Textarea
                                    id="medical"
                                    value={healthData.medicalConditions}
                                    onChange={(e) => setHealthData({ ...healthData, medicalConditions: e.target.value })}
                                    placeholder="List any medical conditions"
                                />
                            </div>
                        </>
                    )}

                    <Separator />

                    {/* Navigation Buttons */}
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setStep(step - 1)}
                            disabled={step === 1}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Previous
                        </Button>

                        {step < 3 ? (
                            <Button
                                onClick={() => setStep(step + 1)}
                                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                            >
                                Next
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Admit Student'}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
