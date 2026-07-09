import type { SupabaseClient } from '@supabase/supabase-js';

export type VerificationDocumentRecord = {
  id: string;
  profileId: string | null;
  companyId: string | null;
  documentType: string;
  status: string;
};

export class VerificationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getDocumentById(id: string): Promise<VerificationDocumentRecord | null> {
    const { data, error } = await this.supabase
      .from('verification_documents')
      .select('id, profile_id, company_id, document_type, status')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      profileId: data.profile_id,
      companyId: data.company_id,
      documentType: data.document_type,
      status: data.status,
    };
  }

  async updateDocumentStatus(input: {
    id: string;
    status: 'approved' | 'rejected';
    reviewerId: string;
    notes?: string | null;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('verification_documents')
      .update({
        status: input.status,
        reviewer_id: input.reviewerId,
        reviewer_notes: input.notes ?? null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateCompanyVerificationStatus(input: {
    companyId: string;
    status: 'approved' | 'rejected';
    isVerified: boolean;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('companies')
      .update({ verification_status: input.status, is_verified: input.isVerified })
      .eq('id', input.companyId);

    if (error) {
      throw new Error(error.message);
    }
  }
}
