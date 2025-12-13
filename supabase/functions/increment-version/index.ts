import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GITHUB_PAT = Deno.env.get('GITHUB_PAT');
    if (!GITHUB_PAT) {
      throw new Error('GITHUB_PAT não configurado');
    }

    // Accept current version from request body
    let currentVersionFromClient: string | null = null;
    try {
      const body = await req.json();
      currentVersionFromClient = body.current_version || null;
    } catch {
      // No body or invalid JSON, will read from GitHub
    }

    const owner = 'agendasuperapi';
    const repo = 'renda-recorrente2';
    const filePath = 'src/config/version.ts';
    const branch = 'main';

    // 1. Get current file content from GitHub
    const getFileResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_PAT}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Supabase-Edge-Function',
          'Cache-Control': 'no-cache',
        },
      }
    );

    if (!getFileResponse.ok) {
      const error = await getFileResponse.text();
      throw new Error(`Erro ao buscar arquivo: ${error}`);
    }

    const fileData = await getFileResponse.json();
    const currentContent = atob(fileData.content.replace(/\n/g, ''));
    const sha = fileData.sha;

    // 2. Extract current version from GitHub file
    const versionMatch = currentContent.match(/APP_VERSION\s*=\s*"(\d+)\.(\d+)\.(\d+)"/);
    if (!versionMatch) {
      throw new Error('Não foi possível encontrar a versão no arquivo');
    }

    const githubMajor = parseInt(versionMatch[1]);
    const githubMinor = parseInt(versionMatch[2]);
    const githubPatch = parseInt(versionMatch[3]);
    const githubVersion = `${githubMajor}.${githubMinor}.${githubPatch}`;

    // 3. Determine which version to use as base
    let major: number, minor: number, patch: number;
    let baseVersion: string;

    if (currentVersionFromClient) {
      const clientMatch = currentVersionFromClient.match(/(\d+)\.(\d+)\.(\d+)/);
      if (clientMatch) {
        const clientMajor = parseInt(clientMatch[1]);
        const clientMinor = parseInt(clientMatch[2]);
        const clientPatch = parseInt(clientMatch[3]);
        const clientVersion = `${clientMajor}.${clientMinor}.${clientPatch}`;

        // Use the higher version between client and GitHub
        const clientTotal = clientMajor * 10000 + clientMinor * 100 + clientPatch;
        const githubTotal = githubMajor * 10000 + githubMinor * 100 + githubPatch;

        if (clientTotal > githubTotal) {
          major = clientMajor;
          minor = clientMinor;
          patch = clientPatch;
          baseVersion = clientVersion;
          console.log(`Using client version ${clientVersion} (higher than GitHub ${githubVersion})`);
        } else {
          major = githubMajor;
          minor = githubMinor;
          patch = githubPatch;
          baseVersion = githubVersion;
          console.log(`Using GitHub version ${githubVersion} (higher or equal to client ${clientVersion})`);
        }
      } else {
        major = githubMajor;
        minor = githubMinor;
        patch = githubPatch;
        baseVersion = githubVersion;
      }
    } else {
      major = githubMajor;
      minor = githubMinor;
      patch = githubPatch;
      baseVersion = githubVersion;
    }

    const newPatch = patch + 1;
    const newVersion = `${major}.${minor}.${newPatch}`;

    // 4. Create new content
    const newContent = currentContent.replace(
      /APP_VERSION\s*=\s*"\d+\.\d+\.\d+"/,
      `APP_VERSION = "${newVersion}"`
    );

    // 5. Commit the change
    const updateResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_PAT}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Supabase-Edge-Function',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `chore: bump version to ${newVersion}`,
          content: btoa(newContent),
          sha: sha,
          branch: branch,
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Erro ao atualizar arquivo: ${error}`);
    }

    console.log(`Version incremented from ${baseVersion} to ${newVersion}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        oldVersion: baseVersion,
        newVersion: newVersion,
        message: `Versão atualizada para ${newVersion}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error incrementing version:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});