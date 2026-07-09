import { NotificationRepository } from '@/lib/domain/repositories/notification.repository';

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async createVerificationNotification(input: {
    userId: string;
    documentType: string;
    action: 'approve' | 'reject';
    notes?: string | null;
    href?: string;
  }): Promise<void> {
    const title = input.action === 'approve' ? 'Document verified' : 'Document needs revision';
    const body =
      input.action === 'approve'
        ? `Your ${input.documentType} was approved.`
        : `Your ${input.documentType} requires updates.${input.notes ? ` ${input.notes}` : ''}`;

    await this.notificationRepository.create({
      userId: input.userId,
      type: 'verification',
      title,
      body,
      href: input.href ?? '/onboarding/seller',
      metadata: { action: input.action, documentType: input.documentType },
    });
  }
}
