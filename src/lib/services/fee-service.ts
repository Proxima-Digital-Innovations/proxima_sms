import { feeRepository } from '../dal/fee-repository';

export class FeeService {
  async saveFeeStructure(data: any) {
    const { id, items, ...rest } = data;
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.amount, 0);

    const feeData = { ...rest, totalAmount };

    if (id) {
      await feeRepository.updateFeeStructureTx(id, feeData, items);
    } else {
      await feeRepository.createFeeStructure(feeData, items);
    }
  }

  async deleteFeeStructure(id: string, ) {
    await feeRepository.deleteFeeStructureTx(id);
  }

  async getFeeStructures() {
    return feeRepository.getFeeStructures();
  }
}
export const feeService = new FeeService();
