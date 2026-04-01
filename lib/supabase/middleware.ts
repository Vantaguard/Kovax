import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Required consent types — must match consent.service.ts
const REQUIRED_CONSENT_TYPES = ['terms_of_service', 'privacy_policy', 'data_processing'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/contact') ||
    request.nextUrl.pathname === '/';

  const isConsentRoute = request.nextUrl.pathname.startsWith('/dashboard/consent');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // Handle case where user was deleted from auth.users but still has a valid JWT
  if (authError?.message?.toLowerCase().includes('sub claim') || authError?.message?.toLowerCase().includes('does not exist')) {
    console.error('[MIDDLEWARE] 🛑 Auth JWT mismatch (user deleted):', authError.message);
    
    const url = request.nextUrl.clone();
    
    if (!isPublicRoute) {
      url.pathname = '/404';
      const response = NextResponse.rewrite(url);
      return response;
    }
  }

  // No user and trying to access protected route → redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // User exists and trying to access dashboard → enforce status + consent check
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: userRecord, error: dbError } = await supabase
      .from('users')
      .select('email, status, organization_id, role:roles(name)')
      .eq('id', user.id)
      .eq('is_deleted', false)
      .maybeSingle();

    console.log(`[MIDDLEWARE] Access check for ${user.email} (${user.id})`);
    console.log(`[MIDDLEWARE] Current path: ${request.nextUrl.pathname}`);

    if (dbError || !userRecord) {
      console.error('[MIDDLEWARE] ERROR or No User Record:', dbError || 'Not Found');
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'Session validation failed. Please sign in again.');
      return NextResponse.redirect(url);
    }

    const role = Array.isArray(userRecord.role) ? userRecord.role[0] : userRecord.role;
    const roleName = (role as { name?: string })?.name?.toLowerCase() || 'no-role';
    const isAdmin = roleName === 'super_admin' || roleName === 'org_admin' || roleName === 'admin';
    
    console.log(`[MIDDLEWARE] User Status: "${userRecord.status}", Role: "${roleName}", Admin: ${isAdmin}`);

    // Non-admin users with non-active status are blocked from dashboard
    if (!isAdmin && userRecord.status !== 'active') {
      console.log(`[MIDDLEWARE] 🛑 ACCESS DENIED: User status is "${userRecord.status}". Redirecting to login.`);
      
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      let errorMessage = 'Sign in to access your dashboard.';
      if (userRecord.status === 'draft') {
        errorMessage = 'Your account is pending admin approval.';
      } else if (userRecord.status === 'inactive') {
        errorMessage = 'This account is currently inactive.';
      } else if (userRecord.status === 'rejected') {
        errorMessage = 'Your application has been rejected by the administrator.';
      } else {
        errorMessage = `Account status is "${userRecord.status}". Only active accounts allowed.`;
      }
      
      url.searchParams.set('error', errorMessage);
      
      const response = NextResponse.redirect(url);
      
      // Force clear the session cookies
      const cookieName = 'sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL!.split('/')[2].split('.')[0] + '-auth-token';
      response.cookies.delete(cookieName);
      
      return response;
    }

    // ═══════════════════════════════════════════════════════════
    // CONSENT CHECK: Redirect to /consent if missing consents
    // ═══════════════════════════════════════════════════════════
    if (!isConsentRoute && !isApiRoute && userRecord.organization_id) {
      const { count, error: consentError } = await supabase
        .from('consents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('organization_id', userRecord.organization_id)
        .eq('is_active', true)
        .in('consent_type', REQUIRED_CONSENT_TYPES);

      if (!consentError && (count || 0) < REQUIRED_CONSENT_TYPES.length) {
        console.log(`[MIDDLEWARE] 📋 CONSENT REQUIRED: User has ${count || 0}/${REQUIRED_CONSENT_TYPES.length} consents. Redirecting.`);
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/consent';
        return NextResponse.redirect(url);
      }
    }

    console.log(`[MIDDLEWARE] ✅ ACCESS GRANTED`);
  }

  return supabaseResponse;
}
