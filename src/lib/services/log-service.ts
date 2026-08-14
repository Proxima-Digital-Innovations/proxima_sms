import { LogRepository } from '../dal/log-repository';

export class LogService {
    static async getAuditLogs() {
        return LogRepository.getAuditLogs();
    }
}
