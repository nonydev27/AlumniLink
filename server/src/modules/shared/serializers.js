const defaultAlt = (r) =>
  r.avatarUrl ? (r.avatarAlt || `Profile photo of ${r.firstName} ${r.lastName}`) : null;
const defaultBannerAlt = (r) =>
  r.bannerUrl ? (r.bannerAlt || `Cover image for ${r.firstName} ${r.lastName}'s profile`) : null;

/**
 * What another person is allowed to see of a profile.
 * Privacy rules: employer/location can be hidden; email, phone and career goals are only
 * shared with accepted connections (and email/phone only if the owner consented).
 */
export function toPublicProfile(r, { viewer, connected = false } = {}) {
  const isSelf = viewer?.id === r.id;
  const full = isSelf || viewer?.role === 'admin';
  const privacy = r.privacy || {};

  const out = {
    id: r.id,
    role: r.role,
    firstName: r.firstName,
    lastName: r.lastName,
    verified: r.verificationStatus === 'verified',
    headline: r.headline ?? null,
    bio: r.bio ?? null,
    programme: r.programme ?? null,
    graduationYear: r.graduationYear ?? null,
    batch: r.batch ?? null,
    industry: r.industry ?? null,
    jobTitle: r.jobTitle ?? null,
    currentCompany: (full || privacy.showEmployer !== false) ? (r.currentCompany ?? null) : null,
    location: (full || privacy.showLocation !== false) ? (r.location ?? null) : null,
    skills: r.skills ?? [],
    interests: r.interests ?? [],
    willingToMentor: Boolean(r.willingToMentor),
    avatarUrl: r.avatarUrl ?? null,
    avatarAlt: defaultAlt(r), // always give screen readers something to read
    bannerUrl: r.bannerUrl ?? null,
    bannerAlt: defaultBannerAlt(r),
    linkedinUrl: (full || connected) ? (r.linkedinUrl ?? null) : null,
  };
  if (full || connected) out.careerGoals = r.careerGoals ?? [];
  if (full || (connected && privacy.shareContactWithConnections === true)) {
    out.email = r.email;
    out.phone = r.phone ?? null;
  }
  return out;
}

export function toSelf(r) {
  return {
    id: r.id,
    email: r.email,
    role: r.role,
    firstName: r.firstName,
    lastName: r.lastName,
    status: r.status,
    verification: { status: r.verificationStatus, note: r.verificationNote ?? null },
    privacy: r.privacy,
    preferences: r.preferences,
    createdAt: r.createdAt,
    profile: {
      headline: r.headline ?? null,
      bio: r.bio ?? null,
      programme: r.programme ?? null,
      graduationYear: r.graduationYear ?? null,
      batch: r.batch ?? null,
      currentCompany: r.currentCompany ?? null,
      jobTitle: r.jobTitle ?? null,
      industry: r.industry ?? null,
      location: r.location ?? null,
      skills: r.skills ?? [],
      interests: r.interests ?? [],
      careerGoals: r.careerGoals ?? [],
      willingToMentor: Boolean(r.willingToMentor),
      seekingMentorship: Boolean(r.seekingMentorship),
      featuredMentorOptIn: Boolean(r.featuredMentorOptIn),
      linkedinUrl: r.linkedinUrl ?? null,
      phone: r.phone ?? null,
      avatarUrl: r.avatarUrl ?? null,
      avatarAlt: r.avatarAlt ?? null,
      bannerUrl: r.bannerUrl ?? null,
      bannerAlt: r.bannerAlt ?? null,
    },
  };
}

/** none | request_sent | request_received | connected - relative to the viewer. */
export function connectionState(viewerId, r) {
  if (!r.connectionId) return 'none';
  if (r.connectionStatus === 'accepted') return 'connected';
  return r.connectionRequesterId === viewerId ? 'request_sent' : 'request_received';
}

export const toOpportunity = (r) => ({
  id: r.id,
  type: r.type,
  title: r.title,
  description: r.description,
  company: r.company ?? null,
  location: r.location ?? null,
  industry: r.industry ?? null,
  isRemote: Boolean(r.isRemote),
  applyUrl: r.applyUrl ?? null,
  eventDate: r.eventDate ?? null,
  deadline: r.deadline ?? null,
  tags: r.tags ?? [],
  status: r.status,
  createdAt: r.createdAt,
  poster: { id: r.postedBy, firstName: r.posterFirstName, lastName: r.posterLastName },
});
