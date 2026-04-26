import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

// Map SessionLanguage → Piston runtime. Versions are stable LTS picks.
const PISTON_RUNTIMES: Record<string, { language: string; version: string; file: string }> = {
  python:     { language: "python",  version: "3.10.0",  file: "main.py"   },
  java:       { language: "java",    version: "15.0.2",  file: "Main.java"  },
  cpp:        { language: "c++",     version: "10.2.0",  file: "main.cpp"   },
  go:         { language: "go",      version: "1.16.2",  file: "main.go"    },
  rust:       { language: "rust",    version: "1.50.0",  file: "main.rs"    },
  ruby:       { language: "ruby",    version: "3.0.1",   file: "main.rb"    },
  php:        { language: "php",     version: "8.0.2",   file: "main.php"   },
  csharp:     { language: "csharp",  version: "6.12.0",  file: "Main.cs"    },
  javascript: { language: "js",      version: "18.15.0", file: "index.js"   },
  typescript: { language: "typescript", version: "5.0.3", file: "index.ts"  },
};

interface PistonResult {
  run?: { stdout: string; stderr: string; code: number; signal: string | null };
  compile?: { stdout: string; stderr: string; code: number; signal: string | null };
  message?: string;
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the caller is a participant of this session
  const { error: accessError } = await supabase
    .from("session_participants")
    .select("id")
    .eq("session_id", id)
    .eq("user_id", user.id)
    .single();

  if (accessError) {
    return NextResponse.json({ error: "Not a participant of this session" }, { status: 403 });
  }

  const body = await request.json() as { code?: string; language?: string };
  const { code, language } = body;

  if (!code || !language) {
    return NextResponse.json({ error: "Missing code or language" }, { status: 400 });
  }

  const runtime = PISTON_RUNTIMES[language];
  if (!runtime) {
    return NextResponse.json(
      { error: `Language "${language}" is not supported for remote execution` },
      { status: 400 },
    );
  }

  let pistonRes: Response;
  try {
    pistonRes = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: runtime.file, content: code }],
        stdin: "",
        args: [],
        run_timeout: 10000,
        compile_timeout: 10000,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json({ error: "Execution service unreachable" }, { status: 502 });
  }

  if (!pistonRes.ok) {
    return NextResponse.json({ error: "Execution service error" }, { status: 502 });
  }

  const result = (await pistonRes.json()) as PistonResult;
  return NextResponse.json(result);
}
