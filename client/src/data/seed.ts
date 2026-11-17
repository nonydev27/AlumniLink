// Demo seed data. All people and organisations are fictional.
// Replace with API calls once the backend is ready (see src/lib/api.ts).
import type { BatchPost, Connection, Conversation, Opportunity, Report, User } from '../types'

const defaultPrivacy = { showEmailToConnections: true, showCompany: true, allowMessagesFrom: 'everyone' as const }

const u = (p: Partial<User> & Pick<User, 'id' | 'role' | 'name' | 'email' | 'programme' | 'gradYear'>): User => ({
  headline: '',
  bio: '',
  location: 'Kumasi',
  skills: [],
  interests: [],
  careerGoals: '',
  mentoring: false,
  verification: 'verified',
  avatarColor: 'bg-brand-100 text-brand-800',
  privacy: defaultPrivacy,
  joinedAt: '2026-01-10T09:00:00Z',
  ...p,
})

export const seedUsers: User[] = [
  // --- Demo accounts ---
  u({
    id: 'u-student', role: 'student', name: 'Akosua Frimpong', email: 'student@alumnilink.demo', indexNumber: '6100124',
    programme: 'Computer Science', gradYear: 2027, headline: 'Final-year Computer Science student',
    bio: 'I enjoy working with data and want to start my career in analytics or machine learning.',
    location: 'Kumasi', skills: ['Python', 'SQL'], interests: ['Machine learning', 'Data visualisation'],
    careerGoals: 'Data analytics or machine learning engineering', avatarColor: 'bg-amber-100 text-amber-900',
  }),
  u({
    id: 'u-alumni', role: 'alumni', name: 'Dr. Kwame Mensah', email: 'alumni@alumnilink.demo',
    programme: 'Computer Science', gradYear: 2012, headline: 'Head of Data Analytics at Volta Insights',
    jobTitle: 'Head of Data Analytics', company: 'Volta Insights', industry: 'Technology', location: 'Accra',
    bio: 'Twelve years in data. Happy to talk about careers in analytics, research and machine learning.',
    skills: ['Machine learning', 'Python', 'SQL', 'Leadership'], interests: ['Machine learning', 'Mentoring', 'Research'],
    mentoring: true,
  }),
  u({
    id: 'u-admin', role: 'admin', name: 'Alumni Relations Office', email: 'admin@alumnilink.demo',
    programme: 'Administration', gradYear: 2000, headline: 'University Alumni Relations',
    location: 'Kumasi', avatarColor: 'bg-slate-200 text-slate-800',
  }),

  // --- Alumni ---
  u({
    id: 'u-abena', role: 'alumni', name: 'Abena Owusu', email: 'abena@example.com', programme: 'Computer Engineering', gradYear: 2017,
    headline: 'Senior Software Engineer at Kente Pay', jobTitle: 'Senior Software Engineer', company: 'Kente Pay', industry: 'Fintech',
    location: 'Kumasi', skills: ['React', 'Node.js', 'Payments'], interests: ['Web development', 'Fintech', 'Mentoring'],
    bio: 'I build payment systems used across West Africa. Ask me about frontend careers and interviews.',
    mentoring: true, avatarColor: 'bg-amber-100 text-amber-900',
  }),
  u({
    id: 'u-yaw', role: 'alumni', name: 'Yaw Boateng', email: 'yaw@example.com', programme: 'Civil Engineering', gradYear: 2015,
    headline: 'Civil Engineer at Northline Construction', jobTitle: 'Civil Engineer', company: 'Northline Construction', industry: 'Engineering',
    location: 'Takoradi', skills: ['Structural design', 'AutoCAD', 'Project management'], interests: ['Infrastructure', 'Sustainability'],
    mentoring: false, avatarColor: 'bg-emerald-100 text-emerald-900',
  }),
  u({
    id: 'u-efua', role: 'alumni', name: 'Efua Asante', email: 'efua@example.com', programme: 'Biomedical Engineering', gradYear: 2016,
    headline: 'Product Manager at Harbour Health', jobTitle: 'Product Manager', company: 'Harbour Health', industry: 'Healthcare',
    location: 'Accra', skills: ['Product strategy', 'User research', 'Agile'], interests: ['Health tech', 'Product management', 'Mentoring'],
    bio: 'From the lab to product management. I love helping engineers explore product roles.',
    mentoring: true, avatarColor: 'bg-rose-100 text-rose-900',
  }),
  u({
    id: 'u-kofi', role: 'alumni', name: 'Kofi Agyeman', email: 'kofi@example.com', programme: 'Economics', gradYear: 2019,
    headline: 'Investment Analyst at Gold Coast Capital', jobTitle: 'Investment Analyst', company: 'Gold Coast Capital', industry: 'Finance',
    location: 'London', skills: ['Financial modelling', 'Excel', 'Python'], interests: ['Investing', 'Data analysis'],
    mentoring: true, avatarColor: 'bg-violet-100 text-violet-900',
  }),
  u({
    id: 'u-ama', role: 'alumni', name: 'Ama Darko', email: 'ama@example.com', programme: 'Communication Design', gradYear: 2020,
    headline: 'UX Designer at Sankofa Studio', jobTitle: 'UX Designer', company: 'Sankofa Studio', industry: 'Design',
    location: 'Remote', skills: ['Figma', 'Accessibility', 'Design systems'], interests: ['Accessibility', 'User research', 'Mentoring'],
    mentoring: true, avatarColor: 'bg-sky-100 text-sky-900',
  }),
  u({
    id: 'u-nana', role: 'alumni', name: 'Nana Adjei', email: 'nana@example.com', programme: 'Computer Science', gradYear: 2021,
    headline: 'Machine Learning Engineer at Lakeside AI', jobTitle: 'Machine Learning Engineer', company: 'Lakeside AI', industry: 'Technology',
    location: 'Accra', skills: ['Python', 'PyTorch', 'Machine learning'], interests: ['Machine learning', 'Open source'],
    bio: 'Recent grad working on language models for African languages.',
    mentoring: true, avatarColor: 'bg-teal-100 text-teal-900',
  }),
  u({
    id: 'u-esi', role: 'alumni', name: 'Esi Quaye', email: 'esi@example.com', programme: 'Business Administration', gradYear: 2014,
    headline: 'HR Lead at Meridian Telecom', jobTitle: 'HR Lead', company: 'Meridian Telecom', industry: 'Telecommunications',
    location: 'Accra', skills: ['Recruiting', 'Interviewing', 'CV review'], interests: ['Careers', 'Mentoring'],
    bio: 'I have reviewed thousands of CVs. Happy to help students prepare for interviews.',
    mentoring: true, avatarColor: 'bg-orange-100 text-orange-900',
  }),
  u({
    id: 'u-kwesi', role: 'alumni', name: 'Kwesi Ofori', email: 'kwesi@example.com', programme: 'Computer Science', gradYear: 2017,
    headline: 'Backend Engineer at Kente Pay', jobTitle: 'Backend Engineer', company: 'Kente Pay', industry: 'Fintech',
    location: 'Kumasi', skills: ['Java', 'PostgreSQL', 'APIs'], interests: ['Distributed systems'],
    mentoring: false, avatarColor: 'bg-lime-100 text-lime-900',
  }),

  // --- Students ---
  u({
    id: 'u-selorm', role: 'student', name: 'Selorm Agbeko', email: 'selorm@example.com', programme: 'Computer Science', gradYear: 2027,
    headline: 'Computer Science student', skills: ['JavaScript'], interests: ['Web development'], careerGoals: 'Frontend developer',
    avatarColor: 'bg-indigo-100 text-indigo-900',
  }),
  u({
    id: 'u-adwoa', role: 'student', name: 'Adwoa Mensah', email: 'adwoa@example.com', programme: 'Economics', gradYear: 2028,
    headline: 'Economics student', interests: ['Investing'], careerGoals: 'Investment banking',
    avatarColor: 'bg-pink-100 text-pink-900',
  }),

  // --- Pending verification (shown in admin queue) ---
  u({
    id: 'u-pending1', role: 'alumni', name: 'Kojo Antwi', email: 'kojo@example.com', programme: 'Mechanical Engineering', gradYear: 2018,
    headline: 'Maintenance Engineer at Tema Port', jobTitle: 'Maintenance Engineer', company: 'Tema Port Services', industry: 'Engineering',
    location: 'Tema', verification: 'pending', joinedAt: '2026-11-15T10:00:00Z', avatarColor: 'bg-cyan-100 text-cyan-900',
  }),
  u({
    id: 'u-pending2', role: 'alumni', name: 'Afia Boakye', email: 'afia@example.com', programme: 'Pharmacy', gradYear: 2013,
    headline: 'Clinical Pharmacist', jobTitle: 'Clinical Pharmacist', company: 'Ridge Hospital', industry: 'Healthcare',
    location: 'Accra', verification: 'pending', joinedAt: '2026-11-16T14:30:00Z', avatarColor: 'bg-fuchsia-100 text-fuchsia-900',
  }),
]

export const seedConnections: Connection[] = [
  { id: 'c1', fromId: 'u-student', toId: 'u-abena', kind: 'connect', status: 'accepted', createdAt: '2026-10-02T10:00:00Z' },
  { id: 'c2', fromId: 'u-selorm', toId: 'u-alumni', kind: 'mentorship', status: 'pending', note: 'Hi Dr. Mensah, I am a CS student interested in data careers. Could you share how you got started?', createdAt: '2026-11-14T08:15:00Z' },
  { id: 'c3', fromId: 'u-adwoa', toId: 'u-alumni', kind: 'connect', status: 'pending', createdAt: '2026-11-16T12:00:00Z' },
  { id: 'c4', fromId: 'u-alumni', toId: 'u-nana', kind: 'connect', status: 'accepted', createdAt: '2026-09-20T12:00:00Z' },
  { id: 'c5', fromId: 'u-kwesi', toId: 'u-student', kind: 'connect', status: 'pending', createdAt: '2026-11-16T18:00:00Z' },
]

export const seedConversations: Conversation[] = [
  {
    id: 'conv1',
    participantIds: ['u-student', 'u-abena'],
    lastReadAt: { 'u-student': '2026-11-10T09:00:00Z', 'u-abena': '2026-11-16T09:30:00Z' },
    messages: [
      { id: 'm1', senderId: 'u-student', body: 'Hello Abena, thank you for accepting my request. I am a final-year CS student and would love advice on preparing for frontend interviews.', sentAt: '2026-11-09T18:20:00Z' },
      { id: 'm2', senderId: 'u-abena', body: 'Happy to help! Start by building one solid project you can explain end to end. What are you working on now?', sentAt: '2026-11-09T19:05:00Z' },
      { id: 'm3', senderId: 'u-student', body: 'I am building a small dashboard with React for our department.', sentAt: '2026-11-10T08:40:00Z' },
      { id: 'm4', senderId: 'u-abena', body: 'Perfect. Focus on accessibility and testing, interviewers love that. Send me the link when it is up and I will take a look.', sentAt: '2026-11-16T09:30:00Z' },
    ],
  },
  {
    id: 'conv2',
    participantIds: ['u-alumni', 'u-nana'],
    lastReadAt: { 'u-alumni': '2026-11-12T10:00:00Z', 'u-nana': '2026-11-12T10:00:00Z' },
    messages: [
      { id: 'm5', senderId: 'u-nana', body: 'Dr. Mensah, are you coming to the CS alumni webinar next month?', sentAt: '2026-11-12T09:00:00Z' },
      { id: 'm6', senderId: 'u-alumni', body: 'Yes, I will be on the panel. See you there!', sentAt: '2026-11-12T10:00:00Z' },
    ],
  },
]

export const seedOpportunities: Opportunity[] = [
  {
    id: 'o1', type: 'internship', title: 'Data Analyst Intern', organisation: 'Volta Insights', location: 'Accra', mode: 'Hybrid',
    description: 'A 3-month paid internship working with our analytics team on real client dashboards. Python and SQL basics required.',
    tags: ['Data', 'Python', 'SQL', 'Machine learning'], postedById: 'u-alumni', postedAt: '2026-11-12T09:00:00Z', date: '2026-12-15',
  },
  {
    id: 'o2', type: 'job', title: 'Junior Frontend Engineer', organisation: 'Kente Pay', location: 'Kumasi', mode: 'Hybrid',
    description: 'Join our payments web team. You will build accessible React interfaces used by thousands of merchants.',
    tags: ['React', 'JavaScript', 'Web development', 'Fintech'], postedById: 'u-abena', postedAt: '2026-11-10T12:00:00Z', date: '2026-12-01',
  },
  {
    id: 'o3', type: 'webinar', title: 'Breaking into product management', organisation: 'Hosted by Efua Asante', location: 'Online', mode: 'Online',
    description: 'A one-hour session on moving from engineering into product roles, with live Q&A.',
    tags: ['Product management', 'Careers'], postedById: 'u-efua', postedAt: '2026-11-08T08:00:00Z', date: '2026-11-29',
    accessibilityNote: 'Live captions and a transcript will be provided.',
  },
  {
    id: 'o4', type: 'reunion', title: 'Class of 2015: 10-year reunion', organisation: 'Batch 2015 committee', location: 'Main campus, Great Hall', mode: 'On-site',
    description: 'Dinner, campus tour and a chance to reconnect with your year group. Partners welcome.',
    tags: ['Reunion', 'Class of 2015'], postedById: 'u-yaw', postedAt: '2026-10-28T10:00:00Z', date: '2026-12-19',
    accessibilityNote: 'Step-free access to the Great Hall.',
  },
  {
    id: 'o5', type: 'internship', title: 'HR & Recruitment Intern', organisation: 'Meridian Telecom', location: 'Accra', mode: 'On-site',
    description: 'Support our recruitment team on graduate hiring. Great for Business and Social Science students.',
    tags: ['HR', 'Recruiting', 'Careers'], postedById: 'u-esi', postedAt: '2026-11-05T10:00:00Z', date: '2026-12-10',
  },
  {
    id: 'o6', type: 'event', title: 'CV clinic for final-year students', organisation: 'Alumni Relations Office', location: 'Library, Room 2', mode: 'On-site',
    description: 'Bring your CV and get one-to-one feedback from alumni volunteers in HR and engineering.',
    tags: ['Careers', 'CV review', 'Interviewing'], postedById: 'u-admin', postedAt: '2026-11-03T10:00:00Z', date: '2026-11-26',
  },
  {
    id: 'o7', type: 'job', title: 'Graduate Investment Analyst', organisation: 'Gold Coast Capital', location: 'London', mode: 'On-site',
    description: 'Two-year graduate programme in investment analysis. Strong Excel and modelling skills needed.',
    tags: ['Finance', 'Investing', 'Excel'], postedById: 'u-kofi', postedAt: '2026-11-01T10:00:00Z', date: '2026-12-31',
  },
  {
    id: 'o8', type: 'webinar', title: 'Machine learning careers in Africa', organisation: 'Hosted by Nana Adjei', location: 'Online', mode: 'Online',
    description: 'What ML engineers actually do day to day, and how to build a portfolio that gets noticed.',
    tags: ['Machine learning', 'Careers', 'Python'], postedById: 'u-nana', postedAt: '2026-11-14T10:00:00Z', date: '2026-12-06',
    accessibilityNote: 'Live captions provided. Recording shared afterwards.',
  },
]

export const seedBatchPosts: BatchPost[] = [
  { id: 'p1', gradYear: 2015, authorId: 'u-yaw', body: 'Reunion details are now on the opportunity board. Please share with anyone from our year who is not on AlumniLink yet!', createdAt: '2026-10-28T10:05:00Z' },
  { id: 'p2', gradYear: 2017, authorId: 'u-abena', body: 'Kente Pay is hiring junior engineers. Happy to refer anyone from our batch or recommend current students.', createdAt: '2026-11-10T12:10:00Z' },
  { id: 'p3', gradYear: 2017, authorId: 'u-kwesi', body: 'Anyone up for a 2017 meetup in Kumasi this December?', createdAt: '2026-11-12T19:00:00Z' },
  { id: 'p4', gradYear: 2027, authorId: 'u-selorm', body: 'Study group for final-year project defences starting next week. Reply if you want to join.', createdAt: '2026-11-13T15:00:00Z' },
  { id: 'p5', gradYear: 2012, authorId: 'u-alumni', body: 'Great to see so many of us mentoring this year. Thank you all for giving back.', createdAt: '2026-11-01T09:00:00Z' },
]

export const seedReports: Report[] = [
  { id: 'r1', targetType: 'opportunity', targetId: 'o7', reporterId: 'u-adwoa', reason: 'Link in description is broken.', status: 'open', createdAt: '2026-11-15T09:00:00Z' },
]

export const PROGRAMMES = [
  'Biomedical Engineering', 'Business Administration', 'Civil Engineering', 'Communication Design', 'Computer Engineering',
  'Computer Science', 'Economics', 'Mechanical Engineering', 'Pharmacy',
]

export const INDUSTRIES = ['Design', 'Engineering', 'Finance', 'Fintech', 'Healthcare', 'Technology', 'Telecommunications']
