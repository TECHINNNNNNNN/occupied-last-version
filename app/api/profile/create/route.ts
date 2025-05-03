import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (existingProfile) {
      // Profile already exists
      return NextResponse.json({ success: true, message: 'Profile already exists' })
    }
    
    // Create new profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: '',
        avatar_url: '',
        role: 'student',
        created_at: new Date().toISOString()
      })
      .select()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error creating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 