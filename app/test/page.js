'use client'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const testContactInvite = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('send-contact-invite', {
        body: { email: 'iohinted@gmail.com', name: 'Test User' },
      })
      const output = { data: data ?? null, error: error ? { name: error.name, message: error.message } : null }
      console.log('contact invite result:', output)
      setResult(output)
    } catch (err) {
      const output = { data: null, error: { message: err instanceof Error ? err.message : 'Unknown error' } }
      console.log('contact invite catch error:', output)
      setResult(output)
    } finally {
      setLoading(false)
    }
  }

  const testCircleInvite = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('send-circle-invite', {
        body: { circle_id: '7aa96eee-c93c-4d92-9e8c-fe64b6a8d7ca', email: 'iohinted@gmail.com', name: 'Test User' },
      })
      const output = { data: data ?? null, error: error ? { name: error.name, message: error.message } : null }
      console.log('circle invite result:', output)
      setResult(output)
    } catch (err) {
      const output = { data: null, error: { message: err instanceof Error ? err.message : 'Unknown error' } }
      console.log('circle invite catch error:', output)
      setResult(output)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '16px' }}>Test page</h1>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={testContactInvite}
          disabled={loading}
          style={{
            padding: '12px 16px',
            backgroundColor: loading ? '#666' : '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'default' : 'pointer',
            fontSize: '16px',
          }}
        >
          {loading ? 'Testing...' : 'Test contact invite'}
        </button>

        <button
          onClick={testCircleInvite}
          disabled={loading}
          style={{
            padding: '12px 16px',
            backgroundColor: loading ? '#666' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'default' : 'pointer',
            fontSize: '16px',
          }}
        >
          {loading ? 'Testing...' : 'Test circle invite'}
        </button>
      </div>

      <pre
        style={{
          padding: '16px',
          background: '#f4f4f4',
          borderRadius: '8px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {result ? JSON.stringify(result, null, 2) : 'No result yet.'}
      </pre>
    </main>
  )
}
