import { BehaviouralRepository } from "../dal/behavioural-repository";

const behaviouralRepository = new BehaviouralRepository();

export class BehaviouralService {
  async logIncident(data: {
    studentId: string;
    type: string;
    severity: string;
    description: string;
    reporterId: string;
  }) {
    return behaviouralRepository.createIncident({
      studentId: data.studentId,
      title: data.type,
      severity: data.severity,
      description: data.description,
      reporterId: data.reporterId
    });
  }

  async resolveIncident(incidentId: string, actionTaken: string) {
    const incidentToUpdate = await behaviouralRepository.findIncidentById(incidentId);
    return behaviouralRepository.resolveIncident(
      incidentId, 
      actionTaken
    );
  }
}
