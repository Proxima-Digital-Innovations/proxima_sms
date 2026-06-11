
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import { getAcademicData } from '@/actions/academic-data';

export type ClassData = {
    id: string;
    name: string;
};

export type SubjectData = {
    id: string;
    name: string;
};

export type DepartmentData = {
    id: string;
    name: string;
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
            const data = await getAcademicData();
            setClasses(data.classes);
            setSubjects(data.subjects);
            setDepartments(data.departments);
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
