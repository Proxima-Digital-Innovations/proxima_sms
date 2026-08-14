import React from "react";
import { getFleetData } from "@/actions/fleet-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bus, MapPin, Wrench, CheckCircle, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

export default async function FleetManagementPage() {
  const fleetDataResponse = await getFleetData();
  const fleetData = fleetDataResponse.data?.vehicles.map((v: any) => ({
    id: v.registrationNo,
    driver: v.dispatches?.[0]?.driver ? `${v.dispatches[0].driver.firstName} ${v.dispatches[0].driver.lastName}` : "Unassigned",
    route: v.routes?.[0]?.name || "N/A",
    status: v.status,
    location: "On Route",
    lastMaintenance: v.updatedAt ? new Date(v.updatedAt).toISOString().split("T")[0] : "N/A",
  })) || [];

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Fleet & Transport</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button>
            <Bus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Vehicles
            </CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fleetDataResponse.data?.vehicles.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Routes
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fleetDataResponse.data?.routes.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Current operational routes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Vehicles currently in service
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Schedule</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">
              Fleet punctuality rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Fleet Status</CardTitle>
          <CardDescription>
            Monitor real-time locations and status of all vehicles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center py-4">
            <Input
              placeholder="Search vehicles, routes, or drivers..."
              className="max-w-sm"
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle ID</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Location</TableHead>
                  <TableHead className="text-right">Last Maintenance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fleetData.map((bus: any) => (
                  <TableRow key={bus.id}>
                    <TableCell className="font-medium">{bus.id}</TableCell>
                    <TableCell>{bus.driver}</TableCell>
                    <TableCell>{bus.route}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          bus.status === "In Transit"
                            ? "default"
                            : bus.status === "Maintenance"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {bus.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bus.location}
                    </TableCell>
                    <TableCell className="text-right">
                      {bus.lastMaintenance}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
