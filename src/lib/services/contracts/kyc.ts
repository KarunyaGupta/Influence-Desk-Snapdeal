import type { Influencer, KycRecord, ProfileEditRequest, ProfileEditFieldGroup } from "@/lib/types";

export interface KycService {
  /** Role-aware: BM/FM/admin receive full values; influencer self receives full. */
  getByInfluencerId(influencerId: string): Promise<KycRecord>;
  requestEdit(input: {
    influencerId: string;
    fieldGroup: ProfileEditFieldGroup;
    reason: string;
  }): Promise<ProfileEditRequest>;
  listEditRequests(influencerId: string): Promise<ProfileEditRequest[]>;
  /** List all fully onboarded (active) influencers with KYC. BM/FM/Admin only. */
  listActiveInfluencers(): Promise<Influencer[]>;
  /** Admin-only: reassign the Influencer Manager for an influencer. */
  reassignManager(influencerId: string, newManagerUserId: string): Promise<Influencer>;
}
