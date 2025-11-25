'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from './use-toast';

export type ClassData = {
    id: string;
    name: string;
    teacherId?: string;
    subjectIds?: string[];
    subjectTeachers?: Record<string, string>;
};

export type SubjectData = {
    id: string;
    name: string;
};

export type DepartmentData = {
    id: string;
    name: string;
};

const getSortValue = (className: string) => {
    const classOrder = ['Pre-Nursery', 'Nursery 1', 'Nursery 2', 'Nursery 3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];
    const index = classOrder.indexOf(className);
    if (index !== -1) return index;

    const match = className.match(/(\D+)(\d+)/);
    if (match) {
        const prefix = match[1].trim().toUpperCase();
        const num = parseInt(match[2], 10);
        let base = 100; // Default for others
        if (prefix.startsWith('PRIMARY')) base = 10;
        else if (prefix.startsWith('JSS')) base = 20;
        else if (prefix.startsWith('SS')) base = 30;
        else if (prefix.startsWith('NURSERY')) base = 5;
        return base + num;
    }
    return 1000; // Put unknown/unmatched classes at the end
};


export function useAcademicData() {
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [departments, setDepartments] = useState<DepartmentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch without server-side sorting for classes to sort manually
            const classesQuery = query(collection(db, 'classes'));
            const subjectsQuery = query(collection(db, 'subjects'), orderBy('name'));
            const departmentsQuery = query(collection(db, 'departments'), orderBy('name'));

            const [classesSnapshot, subjectsSnapshot, departmentsSnapshot] = await Promise.all([
                getDocs(classesQuery),
                getDocs(subjectsQuery),
                getDocs(departmentsQuery),
            ]);

            const classesList = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData));
            
            // Apply natural sorting for classes
            classesList.sort((a, b) => getSortValue(a.name) - getSortValue(b.name));

            const subjectsList = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubjectData));
            const departmentsList = departmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepartmentData));

            setClasses(classesList);
            setSubjects(subjectsList);
            setDepartments(departmentsList);

        } catch (error) {
            console.error("Error fetching academic data:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not load class, subject, or department data.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { classes, subjects, departments, isLoading, refetch: fetchData };
}
