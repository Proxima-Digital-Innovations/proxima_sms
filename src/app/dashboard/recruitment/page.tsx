import React from "react";
import { getAtsData } from "@/actions/ats-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, Briefcase, Users, Clock, CheckSquare } from "lucide-react";
import CandidateCard from "./CandidateCard";
import JobPostDialog from "./JobPostDialog";

export default async function RecruitmentDashboard() {
  const atsDataResponse = await getAtsData();
  const applications = atsDataResponse.data?.jobApplications || [];
  
  const mapApp = (app: any) => ({
    id: app.id,
    name: `${app.firstName} ${app.lastName}`,
    role: app.job?.title || "Unknown Role",
    experience: "N/A", // Add back if you have an experience field
    initials: `${app.firstName[0]}${app.lastName[0]}`.toUpperCase(),
    status: app.status,
  });

  const kanbanData = {
    applied: applications.filter((a: any) => a.status === "PENDING").map(mapApp),
    screening: applications.filter((a: any) => a.status === "REVIEWING").map(mapApp),
    interview: applications.filter((a: any) => a.status === "INTERVIEW").map(mapApp),
    offered: applications.filter((a: any) => a.status === "HIRED").map(mapApp),
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Recruitment & ATS</h2>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search candidates..."
              className="w-64 pl-8"
            />
          </div>
          <JobPostDialog departments={atsDataResponse.data?.departments || []} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{atsDataResponse.data?.jobPostings.filter((p: any) => p.status === "OPEN").length || 0}</div>
            <p className="text-xs text-muted-foreground">Active job postings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applicants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
            <p className="text-xs text-muted-foreground">Total applications received</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time to Hire</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18 Days</div>
            <p className="text-xs text-muted-foreground">Average across roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offers Accepted</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kanbanData.offered.length}</div>
            <p className="text-xs text-muted-foreground">Total hired candidates</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Candidate Pipeline</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Column: Applied */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground">New Applied</h4>
              <Badge variant="secondary">{kanbanData.applied.length}</Badge>
            </div>
            {kanbanData.applied.map((candidate: any) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>

          {/* Column: Screening */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground">Screening</h4>
              <Badge variant="secondary">{kanbanData.screening.length}</Badge>
            </div>
            {kanbanData.screening.map((candidate: any) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>

          {/* Column: Interview */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground">Interviewing</h4>
              <Badge variant="secondary">{kanbanData.interview.length}</Badge>
            </div>
            {kanbanData.interview.map((candidate: any) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>

          {/* Column: Offered */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground">Offered</h4>
              <Badge variant="secondary">{kanbanData.offered.length}</Badge>
            </div>
            {kanbanData.offered.map((candidate: any) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
