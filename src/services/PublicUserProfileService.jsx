import { HttpClient } from "./HttpClient";
import { PublicUserProfile } from "../models/PublicUserProfile";

export class PublicUserProfileService {
  static #instance = null;

  static instance() {
    if (!PublicUserProfileService.#instance) {
      PublicUserProfileService.#instance = new PublicUserProfileService();
    }
    return PublicUserProfileService.#instance;
  }

  constructor() {
    this.http = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? "" });
  }

  async getPublicProfile(userId) {
    const normalizedUserId = `${userId ?? ""}`.trim();
    if (!normalizedUserId) {
      return { profile: PublicUserProfile.empty() };
    }

    const result = await this.http.get(`/api/users/${encodeURIComponent(normalizedUserId)}/public`);
    const payload = result?.profile ?? result?.data ?? null;

    return {
      profile: payload ? PublicUserProfile.fromJSON(payload) : PublicUserProfile.empty(normalizedUserId),
    };
  }
}
