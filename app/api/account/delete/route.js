import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be signed in to delete your account." },
      { status: 401 }
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("full_name, marketing_opt_in")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  if (profile?.marketing_opt_in && user.email) {
    const { error: marketingError } = await admin.from("marketing_contacts").upsert(
      {
        email: user.email,
        full_name: profile.full_name || user.user_metadata?.full_name || null,
        source: "account_delete",
        marketing_opt_in: true,
        deleted_account_at: new Date().toISOString(),
        consent_text:
          "User opted in to receive marketing emails before account deletion.",
      },
      { onConflict: "email" }
    );

    if (marketingError) {
      return NextResponse.json(
        { error: marketingError.message },
        { status: 500 }
      );
    }
  }

  const { data: avatarObjects, error: avatarListError } = await admin.storage
    .from("avatars")
    .list(user.id, {
      limit: 100,
      offset: 0,
    });

  if (avatarListError) {
    return NextResponse.json(
      { error: avatarListError.message },
      { status: 500 }
    );
  }

  if (avatarObjects?.length) {
    const avatarPaths = avatarObjects.map((file) => `${user.id}/${file.name}`);

    const { error: avatarDeleteError } = await admin.storage
      .from("avatars")
      .remove(avatarPaths);

    if (avatarDeleteError) {
      return NextResponse.json(
        { error: avatarDeleteError.message },
        { status: 500 }
      );
    }
  }

  const deletes = [
    admin.from("calendar_events").delete().eq("user_id", user.id),
    admin.from("circle_contributions").delete().eq("user_id", user.id),
    admin.from("circle_invites").delete().eq("user_id", user.id),
    admin.from("circle_members").delete().eq("user_id", user.id),
    admin.from("circles").delete().eq("user_id", user.id),
    admin.from("contacts").delete().eq("user_id", user.id),
    admin.from("feed_comments").delete().eq("user_id", user.id),
    admin.from("feed_events").delete().eq("user_id", user.id),
    admin.from("feed_reactions").delete().eq("user_id", user.id),
    admin.from("hints").delete().eq("user_id", user.id),
    admin.from("profiles").delete().eq("id", user.id),
  ];

  for (const operation of deletes) {
    const { error } = await operation;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }

  // feed_items has three columns referencing auth.users directly
  // (owner_user_id: CASCADE, actor_user_id/target_user_id: SET NULL).
  // Confirmed directly: deleteUser() below triggers these via Supabase's
  // own internal auth-service role, which returns "permission denied
  // for table feed_items" - a different, more restricted role than the
  // service_role client used everywhere else in this route (which does
  // have access, same as every other successful delete above). Cleaning
  // this up explicitly here first, with the client already proven to
  // work, means there's nothing left for that internal role to need to
  // touch when deleteUser() runs.
  const { error: feedOwnerError } = await admin
    .from("feed_items")
    .delete()
    .eq("owner_user_id", user.id);

  if (feedOwnerError) {
    return NextResponse.json({ error: feedOwnerError.message }, { status: 500 });
  }

  const { error: feedActorError } = await admin
    .from("feed_items")
    .update({ actor_user_id: null })
    .eq("actor_user_id", user.id);

  if (feedActorError) {
    return NextResponse.json({ error: feedActorError.message }, { status: 500 });
  }

  const { error: feedTargetError } = await admin
    .from("feed_items")
    .update({ target_user_id: null })
    .eq("target_user_id", user.id);

  if (feedTargetError) {
    return NextResponse.json({ error: feedTargetError.message }, { status: 500 });
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id);

  if (authDeleteError) {
    return NextResponse.json(
      { error: authDeleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
