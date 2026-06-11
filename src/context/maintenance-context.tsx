'use client';
import React, { createContext, useContext, useState } from 'react';


type MaintenanceContextType = {
  isMaintenanceMode: boolean;
  isLoading: boolean;
};

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const MaintenanceProvider = ({ children }: { children: React.ReactNode }) => {
  // Since we are migrating from Firebase to Prisma and there is no system settings
  // model in the relational database yet, we default maintenance mode to false.
  const [isMaintenanceMode] = useState(false);
  const [isLoading] = useState(false);

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode, isLoading }}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
};
