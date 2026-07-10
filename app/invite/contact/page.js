'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

function AcceptContactInvite() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setStatus('logged-out')
        return
      }

      setStatus('ready')
    }

    checkSession()
  }, [supabase])

  const acceptInvite = async () => {
    if (!token) {
      setErrorMessage('Invalid invite link.')
      setStatus('error')
      return
    }

    setStatus('accepting')

    try {
      const { data, error } = await supabase.functions.invoke('accept-contact-invite', {
        body: { token },
      })

      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorBody = await error.context.json()

          setErrorMessage(
            errorBody?.error ||
              errorBody?.detail?.message ||
              error.message ||
              'Something went wrong'
          )
          setStatus('error')
          return
        }

        setErrorMessage(error.message || 'Something went wrong')
        setStatus('error')
        return
      }

      if (!data?.ok) {
        setErrorMessage(data?.error || 'Something went wrong')
        setStatus('error')
        return
      }

      setStatus('success')
      setTimeout(() => router.push('/'), 2000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  if (!token) {
    return (
      <main style={styles.container}>
        <h1 style={styles.heading}>Invalid invite link</h1>
        <p style={styles.error}>
          This invite link is missing information or may no longer be valid.
        </p>
      </main>
    )
  }

  if (status === 'loading') {
    return (
      <main style={styles.container}>
        <p style={styles.muted}>Loading...</p>
      </main>
    )
  }

  if (status === 'logged-out') {
    return (
      <main style={styles.container}>
        <h1 style={styles.heading}>You have been invited as a contact on HintDrop</h1>
        <p style={styles.body}>
          Accept the invite to share your birthday and connect on HintDrop.
        </p>

        <button
          onClick={() => router.push(`/join?invite_token=${token}&invite_type=contact`)}
          style={styles.button}
        >
          Continue to join
        </button>

        <p style={styles.muted}>
          Already have an account?{' '}
          <a
            href={`/join?invite_token=${token}&invite_type=contact`}
            style={styles.link}
          >
            Sign in
          </a>
        </p>
      </main>
    )
  }

  if (status === 'ready') {
    return (
      <main style={styles.container}>
        <h1 style={styles.heading}>You have been invited as a contact on HintDrop</h1>
        <p style={styles.body}>
          Accept to share your birthday and appear in their contacts.
        </p>

        <button onClick={acceptInvite} style={styles.button}>
          Accept invite
        </button>
      </main>
    )
  }

  if (status === 'accepting') {
    return (
      <main style={styles.container}>
        <p style={styles.muted}>Accepting invite...</p>
      </main>
    )
  }

  if (status === 'success') {
    return (
      <main style={styles.container}>
        <h1 style={styles.heading}>Done!</h1>
        <p style={styles.body}>You are now connected. Redirecting you home...</p>
      </main>
    )
  }

  return (
    <main style={styles.container}>
      <h1 style={styles.heading}>Something went wrong</h1>
      <p style={styles.error}>{errorMessage || 'Something went wrong'}</p>
    </main>
  )
}

export default function AcceptContactInvitePage() {
  return (
    <Suspense
      fallback={
        <main style={styles.container}>
          <p style={styles.muted}>Loading...</p>
        </main>
      }
    >
      <AcceptContactInvite />
    </Suspense>
  )
}

const styles = {
  container: {
    maxWidth: '480px',
    margin: '80px auto',
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  body: {
    fontSize: '16px',
    color: '#444',
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  button: {
    display: 'inline-block',
    padding: '14px 24px',
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  muted: {
    fontSize: '14px',
    color: '#888',
  },
  error: {
    fontSize: '14px',
    color: '#e00',
    lineHeight: 1.5,
  },
  link: {
    color: '#000',
    textDecoration: 'underline',
  },
}
