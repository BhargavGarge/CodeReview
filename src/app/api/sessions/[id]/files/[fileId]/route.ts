import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

interface Params {
  params: Promise<{ id: string; fileId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { id, fileId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: file, error } = await supabase
    .from("session_files")
    .select("*")
    .eq("id", fileId)
    .eq("session_id", id)
    .single();

  if (error || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({ file });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id, fileId } = await params;
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

  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      serviceRoleKey,
    );

    const updateData: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };
    if (file_name !== undefined) updateData.file_name = file_name;
    if (content !== undefined) updateData.content = content;

    const { data: file, error } = await supabaseAdmin
      .from("session_files")
      .update(updateData)
      .eq("id", fileId)
      .eq("session_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update file" },
        { status: 500 },
      );
    }

    return NextResponse.json({ file });
  } catch (err) {
    console.error("Error updating file:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, fileId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { error } = await supabaseAdmin
      .from("session_files")
      .delete()
      .eq("id", fileId)
      .eq("session_id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete file" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting file:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
