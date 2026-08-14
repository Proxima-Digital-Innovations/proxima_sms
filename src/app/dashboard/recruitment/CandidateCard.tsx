"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { updateApplicationStatus } from "@/actions/ats-actions";

export default function CandidateCard({ candidate }: { candidate: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (!newStatus || newStatus === candidate.status) return;
    
    setLoading(true);
    await updateApplicationStatus(candidate.id, newStatus);
    setLoading(false);
    router.refresh();
  }

  return (
    <Card className={`shadow-sm transition-shadow ${loading ? 'opacity-50' : 'hover:shadow-md cursor-grab'}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <Badge variant="outline" className="text-xs font-normal">
            {candidate.role}
          </Badge>
          <select 
            className="text-xs border rounded px-1 py-0.5 bg-background text-muted-foreground ml-2 max-w-[100px]"
            value={candidate.status}
            onChange={handleStatusChange}
            disabled={loading}
          >
            <option value="PENDING">Applied</option>
            <option value="REVIEWING">Screening</option>
            <option value="INTERVIEW">Interview</option>
            <option value="HIRED">Offered</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{candidate.initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium leading-none">{candidate.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {candidate.experience} exp.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
