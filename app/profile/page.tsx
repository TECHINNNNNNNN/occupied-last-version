'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Pencil, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user) return
      setLoading(true)
      setError(null)
      
      try {
        // Try to fetch existing profile
        const { data, error } = await supabase
          .from('profiles')
          .select('name, avatar_url, role')
          .eq('id', session.user.id)
          .single()
        
        if (error) {
          if (error.code === 'PGRST116') {
            // Profile not found, create it
            const response = await fetch('/api/profile/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userId: session.user.id }),
            });
            
            if (!response.ok) {
              throw new Error('Failed to create profile');
            }
            
            // After creating, try fetching again
            const { data: newData, error: newError } = await supabase
              .from('profiles')
              .select('name, avatar_url, role')
              .eq('id', session.user.id)
              .single()
              
            if (newError) {
              throw newError;
            }
            
            if (newData) {
              setName(newData.name || '')
              setAvatarUrl(newData.avatar_url || '')
            }
          } else {
            throw error;
          }
        } else if (data) {
          setName(data.name || '')
          setAvatarUrl(data.avatar_url || '')
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to load profile')
      }
      
      setLoading(false)
    }
    
    fetchProfile()
  }, [session?.user])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          name,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)
      
      if (error) {
        throw error
      }
      
      setSuccess(true)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB.')
      return
    }
    if (!session?.user) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        })
        
      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
          throw new Error('Storage is not properly configured. Please contact support.')
        }
        throw uploadError
      }
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
        
      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to get public URL')
      }
      
      // Store the URL in state
      setAvatarUrl(publicUrlData.publicUrl)
      
      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)
        
      if (updateError) {
        throw updateError
      }
      
      setSuccess(true)
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload avatar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full p-8 bg-white rounded-lg shadow relative">
        {/* Avatar at top right */}
        <div className="absolute top-8 right-8">
          <div
            className="relative group cursor-pointer"
            style={{ width: 112, height: 112 }}
            onClick={() => fileInputRef.current?.click()}
          >
            <img
              src={avatarUrl || '/default-avatar.png'}
              alt="Avatar"
              className="w-28 h-28 rounded-full object-cover border-2 border-gray-300 shadow transition group-hover:opacity-80"
            />
            {/* Edit icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full transition">
              <Pencil className="text-white opacity-0 group-hover:opacity-100 w-8 h-8 transition" />
            </div>
            {/* Loading spinner overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-60 rounded-full">
                <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              tabIndex={-1}
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        <div className="mb-4 mt-24"> {/* Add margin top to push content below avatar */}
          <div className="mb-2">
            <span className="font-semibold">Email:</span> {session?.user?.email}
          </div>
          <div className="mb-4">
            <span className="font-semibold">Role:</span> {session?.user?.role}
          </div>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter your name"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            {success && <div className="text-green-600">Profile updated!</div>}
            {error && <div className="text-red-600">{error}</div>}
          </form>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Sign out
        </button>
      </div>
    </div>
  )
} 