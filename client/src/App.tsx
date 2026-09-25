import { LeadForm } from './components/LeadForm'
import { createLead } from './lib/api'

function App() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Lead Tracker</h1>
      <div className="mt-6 max-w-sm">
        <LeadForm onCreate={createLead} />
      </div>
    </main>
  )
}

export default App
