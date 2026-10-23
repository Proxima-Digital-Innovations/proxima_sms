import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Plus, 
  Search, 
  Laptop, 
  Microscope, 
  MonitorPlay,
  Armchair,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Download
} from "lucide-react";

import { getAssetData } from "@/actions/asset-actions";

const getIconForCategory = (category: string) => {
  if (category.toLowerCase().includes("electronics") || category.toLowerCase().includes("computer")) return Laptop;
  if (category.toLowerCase().includes("lab")) return Microscope;
  if (category.toLowerCase().includes("av") || category.toLowerCase().includes("audio")) return MonitorPlay;
  if (category.toLowerCase().includes("furniture")) return Armchair;
  return Laptop;
};

export default async function AssetsPage() {
  const result = await getAssetData();
  const ASSETS = result.data?.assets || [];
  const SUMMARY_METRICS = result.data?.metrics || [];
  return (
    <div className="flex flex-col gap-8 p-8 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Asset Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track, assign, and manage university assets and equipment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {SUMMARY_METRICS.map((metric) => (
          <Card key={metric.title} className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs mt-1 flex items-center gap-1 text-muted-foreground">
                <span className={metric.trend === "up" && metric.title !== "Pending Maintenance" ? "text-emerald-500 font-medium flex items-center" : "text-rose-500 font-medium flex items-center"}>
                  {metric.trend === "up" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {metric.change}
                </span>
                {" "}from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Table Area */}
      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Asset Directory</CardTitle>
              <CardDescription>A complete directory of all physical assets.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search assets..."
                  className="w-[250px] pl-9 bg-muted/40"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[200px] sm:w-[300px]">Asset Details</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ASSETS.map((asset: any) => {
                const Icon = getIconForCategory(asset.category);
                return (
                <TableRow key={asset.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">{asset.name}</div>
                        <div className="text-xs text-muted-foreground">{asset.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{asset.category}</div>
                    <div className="text-xs text-muted-foreground">{asset.department}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{asset.assignedTo}</div>
                    <div className="text-xs text-muted-foreground">Since {asset.purchaseDate}</div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={asset.status === "Available" ? "default" : asset.status === "Assigned" ? "secondary" : "destructive"}
                      className={
                        asset.status === "Available" ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25" : 
                        asset.status === "Assigned" ? "bg-blue-500/15 text-blue-700 hover:bg-blue-500/25" : 
                        "bg-rose-500/15 text-rose-700 hover:bg-rose-500/25"
                      }
                    >
                      {asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div className="text-xs text-rose-500 font-medium">{asset.depreciation}%</div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Reassign Asset</DropdownMenuItem>
                        <DropdownMenuItem>Schedule Maintenance</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-rose-600">Retire Asset</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-border/50 px-6 py-4">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">1-{ASSETS.length}</span> of <span className="font-medium text-foreground">{ASSETS.length}</span> assets
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
