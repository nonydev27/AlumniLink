// Illustrative sample data for the landing page preview.
// Names and organisations are fictional placeholders until the backend is ready.

export interface AlumnusPreview {
  id: string
  name: string
  initials: string
  role: string
  company: string
  industry: string
  programme: string
  batch: number
  location: string
  mentoring: boolean
  skills: string[]
  avatarClass: string
}

export const sampleAlumni: AlumnusPreview[] = [
  {
    id: 'a1',
    name: 'Dr. Kwame Mensah',
    initials: 'KM',
    role: 'Head of Data Analytics',
    company: 'Volta Insights',
    industry: 'Technology',
    programme: 'Computer Science',
    batch: 2012,
    location: 'Accra',
    mentoring: true,
    skills: ['Machine learning', 'Python', 'SQL'],
    avatarClass: 'bg-brand-100 text-brand-800',
  },
  {
    id: 'a2',
    name: 'Abena Owusu',
    initials: 'AO',
    role: 'Senior Software Engineer',
    company: 'Kente Pay',
    industry: 'Fintech',
    programme: 'Computer Engineering',
    batch: 2017,
    location: 'Kumasi',
    mentoring: true,
    skills: ['React', 'Node.js', 'Payments'],
    avatarClass: 'bg-amber-100 text-amber-900',
  },
  {
    id: 'a3',
    name: 'Yaw Boateng',
    initials: 'YB',
    role: 'Civil Engineer',
    company: 'Northline Construction',
    industry: 'Engineering',
    programme: 'Civil Engineering',
    batch: 2015,
    location: 'Takoradi',
    mentoring: false,
    skills: ['Structural design', 'AutoCAD'],
    avatarClass: 'bg-emerald-100 text-emerald-900',
  },
  {
    id: 'a4',
    name: 'Efua Asante',
    initials: 'EA',
    role: 'Product Manager',
    company: 'Harbour Health',
    industry: 'Healthcare',
    programme: 'Biomedical Engineering',
    batch: 2016,
    location: 'Accra',
    mentoring: true,
    skills: ['Product strategy', 'User research'],
    avatarClass: 'bg-rose-100 text-rose-900',
  },
  {
    id: 'a5',
    name: 'Kofi Agyeman',
    initials: 'KA',
    role: 'Investment Analyst',
    company: 'Gold Coast Capital',
    industry: 'Finance',
    programme: 'Economics',
    batch: 2019,
    location: 'London',
    mentoring: true,
    skills: ['Financial modelling', 'Excel'],
    avatarClass: 'bg-violet-100 text-violet-900',
  },
  {
    id: 'a6',
    name: 'Ama Darko',
    initials: 'AD',
    role: 'UX Designer',
    company: 'Sankofa Studio',
    industry: 'Design',
    programme: 'Communication Design',
    batch: 2020,
    location: 'Remote',
    mentoring: true,
    skills: ['Figma', 'Accessibility'],
    avatarClass: 'bg-sky-100 text-sky-900',
  },
]

export type SearchField = 'all' | 'industry' | 'company' | 'programme' | 'location'

export const searchFieldLabels: Record<SearchField, string> = {
  all: 'All fields',
  industry: 'Industry',
  company: 'Company',
  programme: 'Programme',
  location: 'Location',
}

export function matchesSearch(a: AlumnusPreview, query: string, field: SearchField): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack =
    field === 'all'
      ? [a.name, a.role, a.company, a.industry, a.programme, a.location, String(a.batch), ...a.skills]
      : [a[field]]
  return haystack.some((v) => v.toLowerCase().includes(q))
}
