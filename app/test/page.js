'use client'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FunctionsHttpError } from '@supabase/supabase-js'

export default function TestPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [email, setEmail] = useState('hello@hintdrop.app')

  const testContactInvite = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('send-contact-invite', {
        body: { email, name: 'Test User' },
      })

      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorBody = await error.context.json()
          setResult({
            data: null,
            error: {
              name: error.name,
              message: error.message,
              details: errorBody,
            },
          })
          return
        }

        setResult({
          data: null,
          error: { name: error.name, message: error.message },
        })
        return
      }

      setResult({ data: data ?? null, error: null })
    } catch (err) {
      setResult({
        data: null,
        error: { message: err instanceof Error ? err.message : 'Unknown error' },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '16px' }}>Test page</h1>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter test email"
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '420px',
          marginBottom: '16px',
          padding: '12px',
          fontSize: '16px',
          border: '1px solid #ccc',
          borderRadius: '8px',
        }}
      />

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
          marginBottom: '20px',
        }}
      >
        {loading ? 'Testing...' : 'Test contact invite'}
      </button>

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
