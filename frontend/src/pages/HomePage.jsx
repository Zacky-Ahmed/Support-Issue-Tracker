import { useEffect, useRef, useState } from 'react'
import { getIssues, getEngineers, saveIssue, deleteIssue } from '../services/api'

const statuses = ['Open', 'In Progress', 'Resolved']
const blank = { clientName: '', title: '', description: '', priority: 'Medium', status: 'Open', assignedEngineer: '' }
const date = value => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const overdue = (issue, now) => issue.priority === 'High' && issue.status !== 'Resolved' && now - new Date(issue.reportedAt).getTime() > 86400000

function Modal({ title, children, close, busy, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    return () => { dialog.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} className={className} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); if (!busy) close() }}>
    <header className="dialog-head"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="Close dialog" disabled={busy} onClick={close}>×</button></header>
    {children}
  </dialog>
}

export default function HomePage() {
  const [issues, setIssues] = useState([])
  const [engineers, setEngineers] = useState([])
  const [engineerFilter, setEngineerFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState('All')
  const [status, setStatus] = useState('All')
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [editor, setEditor] = useState(null)
  const [form, setForm] = useState(blank)
  const [formError, setFormError] = useState('')
  const [fields, setFields] = useState({})
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [rowBusy, setRowBusy] = useState('')
  const loadVersion = useRef(0)

  async function load(signal) {
    const version = ++loadVersion.current
    setLoading(true); setError('')
    try {
      const [data, roster] = await Promise.all([getIssues(signal), getEngineers(signal)])
      if (version === loadVersion.current) { setIssues(data.issues); setEngineers(roster.engineers); setLoaded(true) }
    } catch (err) { if (err.name !== 'AbortError' && version === loadVersion.current) setError(err.message) }
    finally { if (!signal?.aborted && version === loadVersion.current) setLoading(false) }
  }
  useEffect(() => {
    const controller = new AbortController()
    // Fetch completion updates state; the initial render already shows loading.
    Promise.all([getIssues(controller.signal), getEngineers(controller.signal)]).then(([data, roster]) => { setIssues(data.issues); setEngineers(roster.engineers); setLoaded(true); setLoading(false) }).catch(err => { if (err.name !== 'AbortError') { setError(err.message); setLoading(false) } })
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [])
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer) } }, [notice])

  const overdueCount = issues.filter(issue => overdue(issue, now)).length
  const active = issues.filter(issue => issue.status !== 'Resolved').length
  const resolved = issues.filter(issue => issue.status === 'Resolved').length
  const progress = issues.filter(issue => issue.status === 'In Progress').length
  const visible = issues.filter(issue => {
    const term = query.trim().toLowerCase()
    return (issue.clientName.toLowerCase().includes(term) || issue.title.toLowerCase().includes(term)) &&
      (priority === 'All' || issue.priority === priority) && (status === 'All' || issue.status === status) && (engineerFilter === 'All' || (engineerFilter === 'Unassigned' ? !issue.assignedEngineer : issue.assignedEngineer === engineerFilter)) && (!onlyOverdue || overdue(issue, now))
  })
  const filtered = query || priority !== 'All' || status !== 'All' || engineerFilter !== 'All' || onlyOverdue
  const reset = () => { setQuery(''); setPriority('All'); setStatus('All'); setEngineerFilter('All'); setOnlyOverdue(false) }
  function openEditor(issue) {
    setEditor(issue || {}); setForm(issue ? { clientName: issue.clientName, title: issue.title, description: issue.description, priority: issue.priority, status: issue.status, assignedEngineer: issue.assignedEngineer || '' } : { ...blank })
    setFormError(''); setFields({})
  }
  async function submit(event) {
    event.preventDefault()
    const invalid = {}
    for (const key of ['clientName', 'title', 'description']) if (!form[key].trim()) invalid[key] = 'This field cannot be empty.'
    if (editor._id && form.status === 'Resolved' && !form.assignedEngineer) invalid.assignedEngineer = 'Select an engineer before resolving this issue.'
    setFields(invalid)
    if (Object.keys(invalid).length) { setFormError('Please check the highlighted fields.'); return }
    setBusy(true); setFormError('')
    try {
      const body = { ...form }
      if (!editor._id) delete body.status
      const { issue } = await saveIssue(editor._id, body)
      setIssues(previous => editor._id ? previous.map(item => item._id === issue._id ? issue : item) : [issue, ...previous])
      setEditor(null); setNotice(editor._id ? 'Issue updated.' : 'Issue recorded. Your team can take it from here.')
    } catch (err) { setFormError(err.message); setFields(err.fields || {}) }
    finally { setBusy(false) }
  }
  async function changeStatus(issue, nextStatus) {
    if (nextStatus === 'Resolved' && !issue.assignedEngineer) {
      openEditor(issue); setFormError('Assign an engineer before resolving this issue.'); setFields({ assignedEngineer: 'An engineer is required to resolve this issue.' }); return
    }
    setRowBusy(issue._id); setError('')
    try {
      const data = await saveIssue(issue._id, { status: nextStatus })
      setIssues(previous => previous.map(item => item._id === issue._id ? data.issue : item))
      setNotice('Status changed to ' + nextStatus + '.')
    } catch (err) { setError(err.message) }
    finally { setRowBusy('') }
  }
  async function confirmDelete() {
    setBusy(true); setDeleteError('')
    try {
      await deleteIssue(deleting._id)
      setIssues(previous => previous.filter(item => item._id !== deleting._id))
      setDeleting(null); setNotice('Issue deleted.')
    } catch (err) { setDeleteError(err.message) }
    finally { setBusy(false) }
  }
  return <div className="desk">
    <aside className="rail">
      <a className="brand" href="#main"><span className="brand-mark">m<span>·</span></span><span>MOUSE<br/>SOFT<span className="brand-sub">CLIENT OPERATIONS</span></span></a>
      <div className="rail-label">YOUR WORKSPACE</div>
      <button className={!onlyOverdue ? 'nav active' : 'nav'} onClick={reset}><span>▤</span> Issue register <b>{issues.length}</b></button>
      <button className={onlyOverdue ? 'nav active' : 'nav'} onClick={() => { reset(); setOnlyOverdue(true) }}><span>◷</span> Needs attention <b>{overdueCount}</b></button>
      <div className="rail-note"><span className="little-star">✳</span><h3>Every issue.<br/>A step forward.</h3><p>A shared place to turn client problems into progress.</p></div>
      <div className="rail-footer"><span className="small-logo">MS</span><div>Support workspace<small>Local edition / 01</small></div></div>
    </aside>
    <main id="main">
      <div className="topline"><span>WORKSPACE <span className="slash">/</span> SUPPORT DESK</span><span className="today">{new Date(now).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
      <header className="hero"><div><div className="eyebrow"><span/> GOOD SUPPORT STARTS HERE</div><h1>Small issues.<br/><em>Clear resolutions.</em></h1><p>Your client conversations, organized into action.</p></div><button className="primary new-button" disabled={loading || !!rowBusy || !loaded} onClick={() => openEditor(null)}><span>＋</span> New issue <span className="button-arrow">↗</span></button></header>
      <section className="metrics" aria-label="Issue overview">
        <div className="metric"><span>01 / ACTIVE QUEUE</span><strong>{loaded ? String(active).padStart(2,'0') : '—'}</strong><small>Open + in progress</small></div>
        <div className="metric"><span>02 / IN MOTION</span><strong>{loaded ? String(progress).padStart(2,'0') : '—'}<i className="motion">↗</i></strong><small>Work is underway</small></div>
        <div className="metric"><span>03 / CLOSED LOOP</span><strong>{loaded ? String(resolved).padStart(2,'0') : '—'}<i className="done">✓</i></strong><small>Resolved and retained</small></div>
        <button className="metric urgent" onClick={() => { reset(); setOnlyOverdue(true) }}><span>04 / NEEDS ATTENTION</span><strong>{loaded ? String(overdueCount).padStart(2,'0') : '—'}<i>↗</i></strong><small>High priority · over 24h</small></button>
      </section>
      {error && <div className="error-banner" role="alert"><span>{error}</span><button disabled={loading || !!rowBusy} onClick={() => load()}>Reload issues ↻</button></div>}
      <section className="register">
        <header className="register-head"><div><span className="eyebrow">THE WORKING RECORD</span><h2>{onlyOverdue ? 'Needs attention' : 'Issue register'} <span>{visible.length}</span></h2></div><button className="text-button" disabled={loading || !!rowBusy} onClick={() => load()}>{loading ? 'Refreshing…' : '↻ Refresh'}</button></header>
        <div className="filters"><label className="search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search issues" placeholder="Search a client or an issue…" value={query} maxLength={200} onChange={e => setQuery(e.target.value)}/><kbd>SEARCH</kbd></label><select aria-label="Filter priority" value={priority} onChange={e => setPriority(e.target.value)}><option value="All">All priorities</option>{['High','Medium','Low'].map(p => <option key={p}>{p}</option>)}</select><select aria-label="Filter status" value={status} onChange={e => setStatus(e.target.value)}><option value="All">All statuses</option>{statuses.map(s => <option key={s}>{s}</option>)}</select><select aria-label="Filter engineer" value={engineerFilter} onChange={e => setEngineerFilter(e.target.value)}><option value="All">All engineers</option><option>Unassigned</option>{engineers.map(name => <option key={name}>{name}</option>)}</select></div>
        {filtered && <div className="filter-summary"><span>{visible.length} matching {visible.length === 1 ? 'issue' : 'issues'}{onlyOverdue ? ' · Overdue only' : ''}</span><button className="text-button" onClick={reset}>Clear filters ×</button></div>}
        {loading && !loaded ? <div className="empty"><span className="empty-symbol">◌</span><h3>Opening the register…</h3><p>Fetching your saved issues.</p></div> : !loaded ? <div className="empty"><h3>We couldn’t open the register.</h3><p>Use “Reload issues” above to try again.</p></div> : !visible.length ? <div className="empty"><span className="empty-symbol">{filtered ? '⌕' : '＋'}</span><h3>{filtered ? 'No matches in this view.' : 'A clear desk. A fresh start.'}</h3><p>{filtered ? 'Try a different search or clear the filters.' : 'Record your first client issue. We’ll keep the details together.'}</p><button className="secondary" onClick={filtered ? reset : () => openEditor(null)}>{filtered ? 'Clear filters' : 'Record an issue ↗'}</button></div> : <div className="table-scroll"><table><thead><tr><th>ISSUE / CLIENT</th><th>ENGINEER</th><th>PRIORITY</th><th>STATUS</th><th>REPORTED</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map(issue => {
          const late = overdue(issue, now)
          return <tr key={issue._id} className={late ? 'overdue-row' : ''}><td className="issue-cell"><div className="issue-meta"><span title={issue._id}>#{issue._id.slice(-8).toUpperCase()}</span><span className="client-name">{issue.clientName}</span>{late && <span className="overdue-tag">◷ OVERDUE</span>}</div><button className="issue-title" onClick={() => openEditor(issue)} disabled={!!rowBusy || loading}>{issue.title}</button><p className="issue-description">{issue.description}</p></td><td className="engineer-cell"><span className={issue.assignedEngineer ? 'engineer-name' : 'unassigned'}>{issue.assignedEngineer || 'Unassigned'}</span></td><td><span className={'priority '+issue.priority.toLowerCase()}><span aria-hidden="true">{issue.priority === 'High' ? '↑' : issue.priority === 'Medium' ? '＝' : '↓'}</span>{issue.priority}</span></td><td><select className={'status '+issue.status.toLowerCase().replaceAll(' ','-')} aria-label={'Status for '+issue.title} value={issue.status} disabled={!!rowBusy || loading} onChange={e => changeStatus(issue,e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></td><td className="date-cell">{date(issue.reportedAt)}</td><td><div className="row-actions"><button aria-label={'Edit '+issue.title} title="Edit issue" disabled={!!rowBusy || loading} onClick={() => openEditor(issue)}>↗</button><button aria-label={'Delete '+issue.title} title="Delete issue" disabled={!!rowBusy || loading} onClick={() => { setDeleting(issue); setDeleteError('') }}>×</button></div></td></tr>
        })}</tbody></table></div>}
        <footer className="register-footer"><span>{loaded ? `${visible.length} of ${issues.length} issues` : 'Waiting for records'} <span className="slash">/</span> Newest first</span><span><span className="dot"/> {loading ? 'Syncing…' : loaded ? 'Saved to your workspace' : 'Not connected'}</span></footer>
      </section>
      <footer className="page-footer"><span>MOUSE SOFT <span className="slash">/</span> SUPPORT ISSUE TRACKER</span><span>A little clarity goes a long way. ↗</span></footer>
    </main>
    {notice && <div className="toast" role="status">✓ {notice}</div>}
    {editor && <Modal title={editor._id ? 'Issue details' : 'Record a new issue'} close={() => setEditor(null)} busy={busy} className="editor-dialog">
      <p className="dialog-intro">{editor._id ? 'Keep the record clear. Keep the work moving.' : 'Start with the details. We’ll take care of the record.'}</p>
      {editor._id && <div className="record-info"><span>ISSUE #{editor._id}</span><span>Reported {date(editor.reportedAt)}</span></div>}
      <form onSubmit={submit} noValidate>
        {formError && <div className="form-error" role="alert">{formError}</div>}
        <fieldset disabled={busy}>
          {['clientName','title','description'].map(key => <label className="field" key={key}>{key === 'clientName' ? 'Client name' : key === 'title' ? 'Issue title' : 'Description'} <span className="required">*</span>{key === 'description' ? <textarea rows={5} maxLength={5000} value={form[key]} aria-invalid={!!fields[key]} aria-describedby={fields[key] ? key+'-error' : undefined} onChange={e => setForm({...form,[key]:e.target.value})} placeholder="What happened? Include the impact and any useful details."/> : <input autoFocus={key === 'clientName'} maxLength={key === 'title' ? 200 : 120} value={form[key]} aria-invalid={!!fields[key]} aria-describedby={fields[key] ? key+'-error' : undefined} onChange={e => setForm({...form,[key]:e.target.value})} placeholder={key === 'clientName' ? 'e.g. Nova Tech' : 'A short, specific summary'}/>}{fields[key] && <small id={key+'-error'} className="field-error">{fields[key]}</small>}</label>)}
          <label className="field">Assigned Engineer<select aria-label="Assigned Engineer" value={form.assignedEngineer} aria-invalid={!!fields.assignedEngineer} aria-describedby="engineer-help" onChange={e => setForm({...form,assignedEngineer:e.target.value})}><option value="">Unassigned</option>{engineers.map(name => <option key={name}>{name}</option>)}</select><small id="engineer-help" className={fields.assignedEngineer ? 'field-error' : 'field-hint'}>{fields.assignedEngineer || 'Required before an issue can be resolved.'}</small></label>
          <div className="form-columns"><label className="field">Priority<select value={form.priority} onChange={e => setForm({...form,priority:e.target.value})}>{['Low','Medium','High'].map(p => <option key={p}>{p}</option>)}</select></label>{editor._id ? <label className="field">Status<select value={form.status} onChange={e => setForm({...form,status:e.target.value})}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label> : <div className="new-status"><small>STARTING STATUS</small><span>○ Open</span></div>}</div>
        </fieldset>
        <p className="form-note">{editor._id ? 'The original ID and report time will stay unchanged.' : 'An issue ID and report time are assigned when you save.'}</p>
        <div className="dialog-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setEditor(null)}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Saving…' : editor._id ? 'Save changes ↗' : 'Create issue ↗'}</button></div>
      </form>
    </Modal>}
    {deleting && <Modal title="Close this record for good?" close={() => setDeleting(null)} busy={busy} className="delete-dialog"><span className="delete-symbol">×</span><p>Delete <strong>{deleting.title}</strong> for {deleting.clientName}? This permanently removes the issue. To keep its history, change its status to Resolved instead.</p>{deleteError && <div className="form-error" role="alert">{deleteError}</div>}<div className="dialog-actions"><button className="secondary" disabled={busy} onClick={() => setDeleting(null)}>Keep issue</button><button className="danger" disabled={busy} onClick={confirmDelete}>{busy ? 'Deleting…' : 'Delete issue'}</button></div></Modal>}
  </div>
}
