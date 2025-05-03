import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Create a standard Supabase client for the current request
    // This will include the user's session cookie automatically
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get: (name: string) => request.cookies.get(name)?.value,
        },
      } as any // Type assertion needed for cookies option
    );

    // Get user session from Supabase Auth
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to cancel a reservation' },
        { status: 401 }
      );
    }
    
    // Extract reservation ID from request
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }
    
    // Use the client with the user's session - RLS will work correctly
    const { data, error } = await supabaseClient
      .from('reservations')
      .delete()
      .eq('id', id)
      .eq('user_email', session.user.email)
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Reservation not found or not owned by you' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel reservation' },
      { status: 500 }
    );
  }
} 