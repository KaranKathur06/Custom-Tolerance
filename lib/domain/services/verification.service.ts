import { randomUUID } from 'crypto';
import type { EventBus } from '@/lib/domain/events';
import { VerificationRepository } from '@/lib/domain/repositories/verification.repository';
import { NotificationService } from '@/lib/domain/services/notification.service';

export type VerificationDecisionAction = 'approve' | 'reject';

export class VerificationService {
  constructor(
    private readonly verificationRepository: VerificationRepository,
    private readonly notificationService: NotificationService,
    private readonly eventBus: EventBus,
  ) {}

  async decideDocument(input: {
    documentId: string;
    actorId: string;
    action: VerificationDecisionAction;
    notes?: string | null;
  }): Promise<{ id: string; status: 'approved' | 'rejected' }> {
    const document = await this.verificationRepository.getDocumentById(input.documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    const status = input.action === 'approve' ? 'approved' : 'rejected';

    await this.verificationRepository.updateDocumentStatus({
      id: input.documentId,
      status,
      reviewerId: input.actorId,
      notes: input.notes ?? null,
    });

    if (input.action === 'approve' && document.companyId) {
      await this.verificationRepository.updateCompanyVerificationStatus({
        companyId: document.companyId,
        status,
        isVerified: true,
      });
    }

    if (document.profileId) {
      await this.notificationService.createVerificationNotification({
        userId: document.profileId,
        documentType: document.documentType,
        action: input.action,
        notes: input.notes ?? null,
      });
    }

    await this.eventBus.publish({
      id: randomUUID(),
      type: input.action === 'approve' ? 'verification.document.approved' : 'verification.document.rejected',
      aggregateId: input.documentId,
      aggregateType: 'verification_document',
      occurredAt: new Date().toISOString(),
      actorId: input.actorId,
      correlationId: randomUUID(),
      version: 1,
      payload: {
        documentId: input.documentId,
        companyId: document.companyId,
        profileId: document.profileId,
        status,
        notes: input.notes ?? null,
      },
    });

    return { id: input.documentId, status };
  }
}
