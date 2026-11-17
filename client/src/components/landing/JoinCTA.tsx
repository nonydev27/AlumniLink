import { Link } from 'react-router'
import { Icon } from '../ui/Icon'

export const JoinCTA = () => (
  <section id="join" aria-labelledby="join-title" className="px-4 pb-16 sm:px-6 sm:pb-24">
    <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-12 text-white sm:px-12 sm:py-16">
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
      <div aria-hidden="true" className="absolute -bottom-32 right-24 h-64 w-64 rounded-full bg-accent-400/20" />

      <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 id="join-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Your next mentor is one connection away.
          </h2>
          <p className="mt-4 max-w-lg text-lg text-brand-100">
            Join free with your graduation year, programme and batch. Students find guidance, alumni give back.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/register?role=student"
            className="group flex flex-col rounded-2xl bg-white p-6 text-slate-900 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <Icon name="graduation" className="h-7 w-7 text-brand-700" />
            <span className="mt-4 text-lg font-bold">Join as a student</span>
            <span className="mt-1 text-sm text-slate-700">Find mentors, internships and career advice.</span>
            <span className="mt-5 inline-flex items-center gap-1 font-semibold text-brand-700 group-hover:gap-2 transition-all">
              Get started <Icon name="arrowRight" className="h-4 w-4" />
            </span>
          </Link>
          <Link
            to="/register?role=alumni"
            className="group flex flex-col rounded-2xl bg-white/10 p-6 ring-1 ring-white/25 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <Icon name="users" className="h-7 w-7 text-accent-400" />
            <span className="mt-4 text-lg font-bold">Join as an alumnus</span>
            <span className="mt-1 text-sm text-brand-100">Reconnect with your batch and mentor students.</span>
            <span className="mt-5 inline-flex items-center gap-1 font-semibold group-hover:gap-2 transition-all">
              Give back <Icon name="arrowRight" className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  </section>
)

export default JoinCTA
