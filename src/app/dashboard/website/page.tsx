import { prisma } from '@/lib/prisma';
import { WebsiteCMSClient } from '@/components/dashboard/website/website-cms-client';

export default async function WebsiteCMSPage() {
  const school = await prisma.systemProfile.findFirst();

  if (!school) return null;

  const schoolWithContent = {
    ...school,
    websiteConfig: {},
    carouselSlides: [],
    coursePrograms: [],
    publicEvents: [],
    blogPosts: [],
    publicStaffProfiles: [],
    galleryImages: []
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Public Website CMS</h2>
      </div>
      <p className="text-muted-foreground">
        Manage the content that appears on your school's public landing page.
      </p>

      {/* 
        We pass the serialized data to a client component to handle the forms and UI interactions. 
        Using a hacky JSON parse/stringify here purely to bypass any complex date serialization issues from Prisma to Client Component.
      */}
      <WebsiteCMSClient data={JSON.parse(JSON.stringify(schoolWithContent))} />
    </div>
  );
}
