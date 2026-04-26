import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: files, error } = await supabase
    .from("session_files")
    .select("id, file_name, created_at, updated_at, created_by")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 },
    );
  }

  return NextResponse.json({ files });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { file_name, content } = body as {
    file_name?: string;
    content?: string;
  };

  if (!file_name || !file_name.trim()) {
    return NextResponse.json(
      { error: "file_name is required" },
      { status: 400 },
    );
  }

  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      serviceRoleKey,
    );

    const { data: file, error } = await supabaseAdmin
      .from("session_files")
      .insert({
        session_id: id,
        file_name: file_name.trim(),
        content: content || "",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create file:", error);
      return NextResponse.json(
        { error: "Failed to create file" },
        { status: 500 },
      );
    }

    return NextResponse.json({ file }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error creating file:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
