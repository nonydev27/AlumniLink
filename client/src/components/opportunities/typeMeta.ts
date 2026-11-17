import type { OpportunityType } from '../../types'
import type { BadgeTone } from '../ui/Badge'
import type { IconName } from '../ui/Icon'

export const typeMeta: Record<OpportunityType, { label: string; tone: BadgeTone; icon: IconName; dateLabel: string }> = {
  job: { label: 'Job', tone: 'success', icon: 'briefcase', dateLabel: 'Apply by' },
  internship: { label: 'Internship', tone: 'brand', icon: 'briefcase', dateLabel: 'Apply by' },
  webinar: { label: 'Webinar', tone: 'violet', icon: 'calendar', dateLabel: 'Date' },
  event: { label: 'Event', tone: 'neutral', icon: 'calendar', dateLabel: 'Date' },
  reunion: { label: 'Reunion', tone: 'warning', icon: 'users', dateLabel: 'Date' },
}
