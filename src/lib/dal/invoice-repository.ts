import { prisma } from '@/lib/prisma';

export class InvoiceRepository {
  async getActiveTerm() {
    return prisma.term.findFirst({
      where: { isActive: true }
    });
  }

  async getActiveStudentsInClass(classId: string, ) {
    return prisma.student.findMany({
      where: {
        classId,
        status: 'Active'
      }
    });
  }

  async createInvoicesBulk(invoicesData: any[]) {
    return prisma.$transaction(
      invoicesData.map(data => 
        prisma.invoice.create({ data })
      )
    );
  }

  async updateInvoiceStatus(id: string, status: string) {
    return prisma.invoice.update({
      where: { id },
      data: { status }
    });
  }
}
export const invoiceRepository = new InvoiceRepository();
