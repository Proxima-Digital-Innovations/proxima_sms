import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Package, AlertTriangle, ArrowRightLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function InventoryDashboardPage({ params }: { params: Promise<{ school: string }> }) {
  
  
  const school = await prisma.systemProfile.findFirst();

  if (!school) return null;

  const items = await prisma.inventoryItem.findMany({
    where: { }
  });

  const lowStockItems = items.filter(i => i.quantity <= i.minQuantity);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory & Assets</h2>
          <p className="text-muted-foreground mt-1">Manage school property, supplies, and asset allocations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" /> Transactions
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items Types</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets in Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.reduce((acc, curr) => acc + curr.quantity, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-rose-500">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">{lowStockItems.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Stock</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
             <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
             <p>No items in inventory.</p>
           </div>
          ) : (
            <div className="rounded-md border">
              <div className="w-full overflow-x-auto custom-scrollbar"><table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left font-medium text-muted-foreground">
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">In Stock</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {item.name}
                        {item.quantity <= item.minQuantity && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-500">
                            Low Stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{item.category?.name || item.category || '-'}</td>
                      <td className="px-4 py-3">{item.sku || '-'}</td>
                      <td className="px-4 py-3">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-3">{item.location || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm">Manage</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
