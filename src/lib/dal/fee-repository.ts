import { prisma } from '@/lib/prisma';

export class FeeRepository {
  async updateFeeStructureTx(id: string, data: any, items: any[]) {
    return prisma.$transaction(async (tx) => {
      await tx.feeItem.deleteMany({ where: { feeStructureId: id } });
      await tx.feeStructure.update({
        where: { id },
        data: {
          ...data,
          items: {
            create: items
          }
        }
      });
    });
  }

  async createFeeStructure(data: any, items: any[]) {
    return prisma.feeStructure.create({
      data: {
        ...data,
        items: {
          create: items
        }
      }
    });
  }

  async deleteFeeStructureTx(id: string, ) {
    return prisma.$transaction([
      prisma.feeItem.deleteMany({ where: { feeStructureId: id } }),
      prisma.feeStructure.delete({ where: { id } })
    ]);
  }

  async getFeeStructures() {
    return prisma.feeStructure.findMany({
      where: {},
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
export const feeRepository = new FeeRepository();
