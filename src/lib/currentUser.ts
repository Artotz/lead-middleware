import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/events";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
};

const pickName = (user: { email?: string | null; user_metadata?: any }) => {
  const metadata = user.user_metadata ?? {};
  const fromMetadata =
    metadata.full_name ??
    metadata.name ??
    metadata.user_name ??
    metadata.username ??
    null;
  return (
    (typeof fromMetadata === "string" ? fromMetadata.trim() : "") ||
    (user.email?.trim() ?? "") ||
    "Usuǭrio"
  );
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    return {
      id: user.id,
      email: user.email ?? "",
      name: pickName(user),
    };
  }

  const mockId = process.env.MOCK_USER_ID?.trim();
  const mockEmail = process.env.MOCK_USER_EMAIL?.trim();
  const mockName = process.env.MOCK_USER_NAME?.trim();

  if (mockId && isUuid(mockId)) {
    return {
      id: mockId,
      email: mockEmail ?? "mock@example.com",
      name: mockName ?? "Mock User",
    };
  }

  return null;
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw Object.assign(new Error("auth_required"), { status: 401 });
  }
  return user;
}
