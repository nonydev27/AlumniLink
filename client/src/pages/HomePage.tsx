import { useState } from 'react'
import { AccessibilitySection } from '../components/landing/AccessibilitySection'
import { DirectoryPreview } from '../components/landing/DirectoryPreview'
import { FeaturesGrid } from '../components/landing/FeaturesGrid'
import { HeroSection } from '../components/landing/HeroSection'
import { HowItWorksSection } from '../components/landing/HowItWorksSection'
import { JoinCTA } from '../components/landing/JoinCTA'
import { OpportunitiesPreview } from '../components/landing/OpportunitiesPreview'
import { TrustedAISection } from '../components/landing/TrustedAISection'
import type { SearchField } from '../components/landing/sampleData'

export default function HomePage() {
  const [search, setSearch] = useState<{ query: string; field: SearchField }>({ query: '', field: 'all' })

  return (
    <>
      <HeroSection
        onSearch={(query, field) => {
          setSearch({ query, field })
          document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' })
        }}
      />
      <FeaturesGrid />
      <DirectoryPreview query={search.query} field={search.field} onClear={() => setSearch({ query: '', field: 'all' })} />
      <HowItWorksSection />
      <OpportunitiesPreview />
      <TrustedAISection />
      <AccessibilitySection />
      <JoinCTA />
    </>
  )
}
