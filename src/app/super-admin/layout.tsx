import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Command',
  description: 'Manage tenant schools and licenses',
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
