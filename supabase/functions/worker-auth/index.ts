import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Normalise to last 8 digits for loose phone matching. */
function normalizePhone(p: string): string {
  return p.replace(/\D/g, '').slice(-8)
}

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Always returns 200; check `error` field in response body for failures.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, inviteCode } = await req.json()

    if (!phone || !inviteCode) {
      return jsonOk({ error: 'phone and inviteCode are required' })
    }

    const code = (inviteCode as string).toUpperCase().trim()
    const normPhone = (phone as string).startsWith('+')
      ? (phone as string)
      : `+${phone as string}`

    // Admin client — uses service role key, bypasses RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── 1. Fetch invite ───────────────────────────────────────────────────────
    const { data: invite, error: invErr } = await supabaseAdmin
      .from('team_invites')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle()

    if (invErr || !invite) {
      return jsonOk({ error: 'Invalid invite code. Please check the code and try again.' })
    }

    // ── 2. Verify phone ───────────────────────────────────────────────────────
    const canonicalPhone = invite.phone as string
    if (normalizePhone(canonicalPhone) !== normalizePhone(normPhone)) {
      return jsonOk({ error: 'This invite code does not match your phone number.' })
    }

    const digits = canonicalPhone.replace(/\D/g, '')
    const workerEmail = `${digits}@agrimanager.app`

    // ── 3. Try sign-in first (returning worker with matching password) ─────────
    const { data: signInData } = await supabaseAdmin.auth.signInWithPassword({
      email: workerEmail,
      password: code,
    })

    if (signInData?.session) {
      // If the invite was redeemed by a *different* user, reject
      if (
        invite.redeemed_at &&
        (invite.redeemed_by as string | null) !== signInData.user!.id
      ) {
        return jsonOk({
          error: 'This invite code has already been used. Ask your farm owner for a new code.',
        })
      }
      return jsonOk({ session: signInData.session, user: signInData.user, invite })
    }

    // ── 4. New worker: invite must be unredeemed ──────────────────────────────
    if (invite.redeemed_at) {
      return jsonOk({
        error: 'This invite code has already been used. Ask your farm owner for a new code.',
      })
    }

    // ── 5. Create account via admin API (email_confirm bypasses email verification) ─
    const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: workerEmail,
      password: code,
      email_confirm: true,
      user_metadata: {
        full_name: invite.full_name,
        phone: canonicalPhone,
        worker: true,
      },
    })

    if (createErr) {
      // An account already exists for this phone (from a previous invite attempt with a
      // different code). Find the user and reset their password to the new invite code.
      const isAlreadyExists =
        createErr.message?.toLowerCase().includes('already') ||
        createErr.message?.toLowerCase().includes('duplicate')

      if (!isAlreadyExists) {
        return jsonOk({ error: createErr.message ?? 'Could not create worker account.' })
      }

      // List users and find by email (admin only — service role required)
      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

      if (listErr) {
        return jsonOk({ error: 'Could not locate existing account. Please contact support.' })
      }

      const existingUser = listData.users.find(
        (u: { email?: string; id: string }) => u.email === workerEmail
      )

      if (!existingUser) {
        return jsonOk({ error: 'Could not locate existing account. Please contact support.' })
      }

      // Reset password to the new invite code so sign-in will succeed
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: code,
      })

      if (updateErr) {
        return jsonOk({ error: 'Could not update worker account. Please try again.' })
      }
    } else if (!createData?.user) {
      return jsonOk({ error: 'Could not create worker account.' })
    }

    // ── 6. Sign the user in ───────────────────────────────────────────────────
    const { data: signInData2, error: signInErr2 } = await supabaseAdmin.auth.signInWithPassword({
      email: workerEmail,
      password: code,
    })

    if (signInErr2 || !signInData2?.session) {
      return jsonOk({
        error: 'Account ready but sign-in failed. Please try again in a moment.',
      })
    }

    return jsonOk({ session: signInData2.session, user: signInData2.user, invite })
  } catch (e) {
    return jsonOk({ error: (e as Error).message ?? 'Server error. Please try again.' })
  }
})
