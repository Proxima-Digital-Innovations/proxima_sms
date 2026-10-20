import React from "react";
import { getChartOfAccounts } from "@/actions/coa-actions";
import { CoaClient } from "@/components/dashboard/finance/coa-client";

export default async function ChartOfAccountsPage() {
  const result = await getChartOfAccounts();
  const categories = result.data || [];

  return (
    <div className="min-h-screen bg-background pb-12 -mt-6 -mx-6">
      <CoaClient initialCategories={categories} />
    </div>
  );
}
