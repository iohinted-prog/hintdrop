'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AcceptContactInvitePage() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading') // loading | logged-out | accepting | success | error
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setStatus('logged-out')
      } else {
        setStatus('ready')
      }
    }
    checkSession()
  }, [supabase])

  const acceptInvite = async () => {
    setStatus('accepting')
    try {
      const { data, error } = await supabase.functions.invoke('accept-contact-invite', {
        body: { token },
      })

      if (error || !data?.ok) {
        setErrorMessage(data?.error ?? error?.message ?? 'Something went wrong')
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

  const handleSignUp = () => {
    router.push(`/sign-up?invite_token=${token}&invite_type=contact`)
  }

  if (!token) {
    return (
      <main style={styles.container}>
        <p style={styles.error}>Invalid invite link.</p>
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
        <h1 style={styles.heading}>You have been invited as a contact on Hinted</h1>
        <p style={styles.body}>Accept to share your birthday and see their hints page.</p>
        <button onClick={handleSignUp} style={styles.button}>Accept and create account</button>
        <p style={styles.muted}>Already have an account? <a href={`/sign-in?invite_token=${token}&invite_type=contact`} style={styles.link}>Sign in</a></p>
      </main>
    )
  }

  if (status === 'ready') {
    return (
      <main style={styles.container}>
        <h1 style={styles.heading}>You have been invited as a contact on Hinted</h1>
        <p style={styles.body}>Accept to share your birthday and appear in their contacts.</p>
        <button onClick={acceptInvite} style={styles.button}>Accept invite</button>
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

  if (status === 'error') {
    return (
      <main style={styles.container}>
        <h1 style={styles.heading}>Something went wrong</h1>
        <p style={styles.error}>{errorMessage}</p>
      </main>
    )
  }
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
  },
  link: {
    color: '#000',
    textDecoration: 'underline',
  },
}
