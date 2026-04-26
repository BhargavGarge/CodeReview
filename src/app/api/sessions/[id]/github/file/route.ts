import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

interface GithubRepoInfo {
  owner: string;
  repo: string;
}

function parseGithubUrl(raw: string | null | undefined): GithubRepoInfo | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!url.hostname.endsWith("github.com")) return null;
    const segments = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (segments.length < 2) return null;
    const [owner, repoWithMaybeGit] = segments;
    const repo = repoWithMaybeGit.replace(/\.git$/i, "");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: "Missing 'path' query parameter." },
      { status: 400 },
    );
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .select("id, owner_id, github_repo_url")
    .eq("id", id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!session.github_repo_url) {
    return NextResponse.json(
      { error: "No GitHub repository is attached to this session." },
      { status: 400 },
    );
  }

  const parsed = parseGithubUrl(session.github_repo_url);
  if (!parsed) {
    return NextResponse.json(
      { error: "The attached GitHub URL is not valid." },
      { status: 400 },
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "codereview-live",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    // Fetch repo metadata to get the default branch
    const repoRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers },
    );

    if (!repoRes.ok) {
      const text = await repoRes.text().catch(() => "");
      console.error("[github-file] repo error", repoRes.status, text);
      return NextResponse.json(
        { error: "Failed to load GitHub repository metadata." },
        { status: 502 },
      );
    }

    const repoJson = (await repoRes.json()) as {
      default_branch?: string;
    };

    const defaultBranch = repoJson.default_branch || "main";

    // GitHub's contents API expects a slash-separated path; we must not
    // URL-encode the slashes themselves. Encode individual segments instead.
    const safePath = path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    const fileRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${safePath}?ref=${encodeURIComponent(defaultBranch)}`,
      { headers },
    );

    if (!fileRes.ok) {
      const text = await fileRes.text().catch(() => "");
      console.error("[github-file] file error", fileRes.status, text);
      return NextResponse.json(
        { error: "Failed to load file from GitHub." },
        { status: 502 },
      );
    }

    const fileJson = (await fileRes.json()) as {
      type?: string;
      encoding?: string;
      content?: string;
      name?: string;
      path?: string;
    };

    if (fileJson.type !== "file" || !fileJson.content) {
      return NextResponse.json(
        { error: "Selected path is not a regular file." },
        { status: 400 },
      );
    }

    let text = "";
    try {
      if (fileJson.encoding === "base64") {
        text = Buffer.from(fileJson.content, "base64").toString("utf-8");
      } else {
        text = fileJson.content;
      }
    } catch (err) {
      console.error("[github-file] decode error", err);
      return NextResponse.json(
        { error: "Failed to decode file contents from GitHub." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      path: fileJson.path ?? path,
      name: fileJson.name ?? path.split("/").pop() ?? path,
      content: text,
    });
  } catch (err) {
    console.error("[github-file] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error while loading file from GitHub." },
      { status: 500 },
    );
  }
}
