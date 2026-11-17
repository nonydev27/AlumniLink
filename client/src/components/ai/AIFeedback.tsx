import { useStore } from '../../lib/store'
import { Icon } from '../ui/Icon'

/** "Was this helpful?" loop so users can correct the AI. */
export function AIFeedback({ feedbackKey }: { feedbackKey: string }) {
  const { myState, giveAIFeedback } = useStore()
  const given = myState.aiFeedback[feedbackKey]
  if (given) {
    return <p role="status" className="text-xs text-slate-600">Thanks for the feedback. It helps improve future suggestions.</p>
  }
  return (
    <div className="flex items-center gap-1 text-xs text-slate-600">
      <span className="mr-1">Was this helpful?</span>
      <button type="button" onClick={() => giveAIFeedback(feedbackKey, 'helpful')} aria-label="Yes, this was helpful" className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-600">
        <Icon name="thumbUp" className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => giveAIFeedback(feedbackKey, 'not-helpful')} aria-label="No, this was not helpful" className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-600">
        <Icon name="thumbDown" className="h-4 w-4" />
      </button>
    </div>
  )
}
