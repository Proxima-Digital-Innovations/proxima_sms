import { TahfeezRepository } from '../dal/tahfeez-repository';

export class TahfeezService {
  private repo = new TahfeezRepository();

  async saveTahfeezScores(scores: any[], ) {
    await this.repo.createScores(scores);
  }

  async updateTahfeezScore(scoreId: string, data: any) {
    await this.repo.updateScore(scoreId, data);
  }

  async deleteTahfeezScore(scoreId: string) {
    await this.repo.deleteScore(scoreId);
  }
}
