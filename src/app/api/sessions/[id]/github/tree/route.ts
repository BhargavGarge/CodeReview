import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

interface GithubRepoInfo {
  owner: string;
  repo: string;
}

interface GithubTreeEntry {
  path: string;
  type: "file" | "dir";
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

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const repoRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers },
    );

    if (!repoRes.ok) {
      const text = await repoRes.text().catch(() => "");
      console.error("[github-tree] repo error", repoRes.status, text);
      return NextResponse.json(
        { error: "Failed to load GitHub repository metadata." },
        { status: 502 },
      );
    }

    const repoJson = (await repoRes.json()) as {
      default_branch?: string;
    };

    const defaultBranch = repoJson.default_branch || "main";

    const treeRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
      { headers },
    );

    if (!treeRes.ok) {
      const text = await treeRes.text().catch(() => "");
      console.error("[github-tree] tree error", treeRes.status, text);
      return NextResponse.json(
        { error: "Failed to load GitHub repository tree." },
        { status: 502 },
      );
    }

    const treeJson = (await treeRes.json()) as {
      tree?: Array<{ path: string; type: string }>;
    };

    const entries: GithubTreeEntry[] =
      treeJson.tree
        ?.filter((item) => item.type === "blob" || item.type === "tree")
        .map((item) => ({
          path: item.path,
          type: item.type === "tree" ? "dir" : "file",
        })) ?? [];

    // Lightweight sort: folders first, then files, both alphabetically.
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.path.localeCompare(b.path);
    });

    return NextResponse.json({
      repo: {
        owner: parsed.owner,
        name: parsed.repo,
        defaultBranch,
      },
      tree: entries,
    });
  } catch (err) {
    console.error("[github-tree] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error while loading GitHub tree." },
      { status: 500 },
    );
  }
}
