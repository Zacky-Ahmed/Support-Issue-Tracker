import ApiStatus from '../components/ApiStatus'

export default function HomePage() {
  return (
    <main className="container">
      <p className="eyebrow">PROJECT STARTER</p>
      <h1>Support Issue Tracker</h1>
      <p>Your React frontend and Express API foundation.</p>
      <ApiStatus />
      <section>
        <h2>Ready for the next step</h2>
        <p>Add issue creation, an issue list, and status updates here after choosing your database.</p>
      </section>
    </main>
  )
}
