import { useEffect, useState } from 'react'
import { getHealth } from '../services/api'

export default function ApiStatus() {
  const [status, setStatus] = useState('Checking API connection…')
  useEffect(() => {
    const controller = new AbortController()
    getHealth(controller.signal)
      .then(() => setStatus('Backend connected'))
      .catch((error) => {
        if (error.name !== 'AbortError') setStatus('Backend unavailable. Start the backend and refresh this page.')
      })
    return () => controller.abort()
  }, [])
  return <p className="api-status" role="status">{status}</p>
}
