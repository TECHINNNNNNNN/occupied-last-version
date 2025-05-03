'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  name: string
  avatar_url: string
  role: string
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isHovering, setIsHovering] = useState(false)

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        toast.error('Failed to fetch profile')
        return
      }

      setProfile(data)
      setName(data.name || '')
    }

    fetchProfile()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsLoading(true)
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile directly with Supabase client for immediate feedback
      const { data: updatedProfileData, error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw updateError
      }

      // Update local state immediately
      setProfile(updatedProfileData)
      toast.success('Profile picture updated!')
    } catch (error) {
      console.error('Full error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update profile picture')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNameSubmit = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // Update profile directly with Supabase client
      const { data: updatedProfileData, error: updateError } = await supabase
        .from('profiles')
        .update({
          name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Name update error:', updateError)
        throw updateError
      }

      setProfile(updatedProfileData)
      setIsEditing(false)
      toast.success('Name updated successfully!')
    } catch (error) {
      console.error('Full error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update name')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Your Profile</h1>
      <Card className="max-w-xl mx-auto p-6 shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <div 
            className="relative"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                {profile?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            {isHovering && (
              <div 
                className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center cursor-pointer"
                onClick={handleAvatarClick}
              >
                <Camera className="w-8 h-8 text-white" />
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </div>
          
          <div className="mt-4 text-center">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-[200px]"
                  placeholder="Enter your name"
                />
                <Button 
                  onClick={handleNameSubmit}
                  disabled={isLoading}
                  size="sm"
                >
                  Save
                </Button>
                <Button 
                  onClick={() => {
                    setIsEditing(false)
                    setName(profile?.name || '')
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-semibold">
                  {profile?.name || user?.email}
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <span className="font-medium text-gray-600">Email: </span>
            <span>{user?.email}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Role: </span>
            <span className="capitalize">{profile?.role || 'User'}</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <Button onClick={handleSignOut} variant="destructive">
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  )
} 