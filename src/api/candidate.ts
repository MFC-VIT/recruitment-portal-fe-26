import api from "./client";

export type Domain = "tech" | "design" | "management";
export type StageState = "done" | "current" | "upcoming" | "failed";

export interface Stage {
  key: "applied" | "submitted" | "review" | "interview" | "result";
  label: string;
  state: StageState;
  at: string | null;
  detail: "booked" | "book-a-slot" | null;
}

export interface DomainTimeline {
  domain: Domain;
  round: number;
  result: "selected" | "rejected" | null;
  stages: Stage[];
  offer: { _id: string; status: OfferStatus } | null;
}

export interface Timeline {
  profileDone: boolean;
  domains: DomainTimeline[];
  meeting: { scheduledTime: string; endTime: string; gmeetLink?: string; domains?: Domain[] } | null;
}

export type OfferStatus = "pending" | "accepted" | "declined" | "revoked";
export type GithubInviteStatus =
  | "not-started"
  | "needs-github"
  | "invited"
  | "already-member"
  | "failed"
  | "disabled";

export interface Offer {
  _id: string;
  domain: Domain;
  status: OfferStatus;
  sentAt: string;
  respondedAt: string | null;
  onboarding: { github: { status: GithubInviteStatus; detail: string } };
  links: Record<string, string> | null;
}

export interface Repo {
  name: string;
  fullName: string;
  url: string;
  homepage: string | null;
  description: string | null;
  language: string | null;
  stars: number;
  fork: boolean;
  pushedAt: string;
}

export const getTimeline = (id: string) =>
  api.get<Timeline>(`/applicatiostatus/timeline/${id}`).then((r) => r.data);

export const getOffers = () => api.get<{ data: Offer[] }>("/offers/mine").then((r) => r.data.data);

export const respondToOffer = (offerId: string, accept: boolean) =>
  api.post<{ data: Offer }>(`/offers/${offerId}/respond`, { accept }).then((r) => r.data.data);

export const retryGithubInvite = (offerId: string) =>
  api.post<{ data: Offer }>(`/offers/${offerId}/github`).then((r) => r.data.data);

export const getGithubConfig = () =>
  api.get<{ enabled: boolean; clientId: string | null }>("/github/config").then((r) => r.data);

export const getGithubMe = () =>
  api
    .get<{ connected: boolean; login: string | null; avatarUrl: string | null }>("/github/me")
    .then((r) => r.data);

export const connectGithub = (code: string) =>
  api.post<{ connected: boolean; login: string }>("/github/connect", { code }).then((r) => r.data);

export const disconnectGithub = () => api.delete("/github");

export const getMyRepos = () => api.get<{ data: Repo[] }>("/github/repos").then((r) => r.data.data);

export const getPushKey = () =>
  api.get<{ enabled: boolean; publicKey: string | null }>("/push/key").then((r) => r.data);

export const savePushSubscription = (sub: PushSubscriptionJSON) => api.post("/push/subscribe", sub);

export const rescheduleInterview = (scheduletime: string) =>
  api.post("/api/meet/reschedule", { scheduletime }).then((r) => r.data);
