'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const { signIn, signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            toast.error('Please check your email and confirm your account before logging in')
          } else if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password')
          } else if (error.message.includes('Password should be')) {
            toast.error('Password must be at least 6 characters')
          } else {
            toast.error(error.message || 'Authentication failed')
          }
          return
        }
        toast.success('Logged in successfully')
        router.push('/dashboard')
      } else {
        const { data, error } = await signUp(email, password)
        if (error) {
          if (error.message.includes('Password should be')) {
            toast.error('Password must be at least 6 characters')
          } else {
            toast.error(error.message || 'Authentication failed')
          }
          return
        }
        
        if (data?.user) {
          toast.success('Account created! Please log in to continue.')
          setMode('login')
          setEmail('')
          setPassword('')
          setFirstName('')
          setLastName('')
          return
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('An error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen  bg-login-bg p-5">
      <div className='grid grid-cols-2 w-full gap-5 font-ancizar'>
        <div className='col-span-2 md:col-span-1  flex flex-col items-center justify-center  rounded-3xl'>
          <Image src="/images/logolibrary.webp" alt="logo" width={75} height={75} className='animate-bounce'/>
          <h1 className='text-3xl text-gray-600 font-bold text-center mb-6 font-ancizar'>
            <span className='text-5xl'>Effortlessly</span> <br /> manage your library space
          </h1>

          <Card className="w-full max-w-md p-6 bg-login-cardBackground rounded-3xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h1 className="text-2xl font-bold text-center mb-6 font-ancizar">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h1>
              
              {mode === 'signup' && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="block text-sm font-medium">
                      First Name
                    </label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="block text-sm font-medium">
                      Last Name
                    </label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-2xl py-5 font-bold bg-login-buttonSignIn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  </div>
                ) : mode === 'login' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </Button>

              <div className="text-center text-sm ">
                {mode === 'login' ? (
                  <p>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-primary hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-primary hover:underline"
                    >
                      Log in
                    </button>
                  </p>
                )}
              </div>
            </form>
          </Card>
        </div>
        <div className='col-span-2 md:col-span-1 hidden md:flex bg-login-containerRight rounded-3xl items-center justify-center'>
          <Image src="/images/colorfulEngineeringlibrary.webp" alt="login-image" width={650} height={650} className='rounded-3xl hover:scale-95 transition-all duration-300'/>
        </div>
      </div>

    </div>
  )
} 