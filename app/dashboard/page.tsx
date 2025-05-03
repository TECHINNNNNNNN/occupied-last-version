'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

const features = [
  { name: 'Profile', href: '/profile', description: 'Manage your user profile and settings.' },
  { name: 'Occupancy', href: '/occupancy', description: 'View real-time and historical library occupancy.' },
  { name: 'Reservations', href: '/reservations', description: 'Book and manage study rooms.' },
  { name: 'Communication', href: '/communication', description: 'Join discussions and communicate with peers.' },
  { name: 'Analytics', href: '/analytics', description: 'Explore usage analytics and reports.' },
]

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Welcome, {user?.email || 'User'}!</h1>
        <Button 
          onClick={handleSignOut} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Link key={feature.name} href={feature.href}>
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer h-full flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">{feature.name}</h2>
                <p className="text-gray-600">{feature.description}</p>
              </div>
              <span className="mt-4 text-indigo-600 hover:underline">Go to {feature.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}