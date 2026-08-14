import { getStaffProfiles } from "@/actions/hr-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function StaffManagementPage() {
  const { success, staff, message } = await getStaffProfiles();

  if (!success) {
    return <div className="p-6 text-red-500">Error: {message}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
        <Button>Add New Staff</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Contract Status</TableHead>
                <TableHead>Level / Step</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff?.map((s: any) => {
                const activeContract = s.contracts?.find((c: any) => c.status === "active");

                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.staffId || "N/A"}</TableCell>
                    <TableCell>{s.firstName} {s.lastName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.role}</Badge>
                    </TableCell>
                    <TableCell>{s.department?.name || "Unassigned"}</TableCell>
                    <TableCell>
                      {activeContract ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                      ) : (
                        <Badge variant="destructive">No Contract</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {activeContract?.level ? `L${activeContract.level}/S${activeContract.step}` : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">View</Button>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {staff?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No staff profiles found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
