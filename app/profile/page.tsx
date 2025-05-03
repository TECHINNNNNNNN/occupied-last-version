'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Your Profile</h1>
      <Card className="max-w-xl mx-auto p-6 shadow-lg">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Account Information</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium text-gray-600">Email: </span>
              <span>{user?.email}</span>
            </div>
          </div>
        </div>
        <Button onClick={handleSignOut} variant="destructive">
          Sign Out
        </Button>
      </Card>
    </div>
  )
} 