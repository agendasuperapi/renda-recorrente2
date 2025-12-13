import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verificar autenticação
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.log('Auth error:', authError?.message)
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar se é super_admin usando a tabela user_roles
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle()
    
    if (!roleData) {
      console.log('User is not super_admin:', user.id)
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas super admins podem disparar deploys.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { version_description } = await req.json()
    
    const GITHUB_PAT = Deno.env.get('GITHUB_PAT')
    if (!GITHUB_PAT) {
      console.error('GITHUB_PAT not configured')
      return new Response(JSON.stringify({ error: 'Token do GitHub não configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const GITHUB_OWNER = 'agendasuperapi'
    const GITHUB_REPO = 'renda-recorrente2'
    const WORKFLOW_FILE = 'deploy-hostinger.yml'

    console.log(`Triggering deploy for ${GITHUB_OWNER}/${GITHUB_REPO}`)

    // Disparar workflow via GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${GITHUB_PAT}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            version_description: version_description || ''
          }
        })
      }
    )

    console.log('GitHub API response status:', response.status)

    if (response.status === 204) {
      console.log('Deploy triggered successfully')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Deploy iniciado com sucesso! Acompanhe o progresso no GitHub Actions.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      const errorText = await response.text()
      console.error('GitHub API error:', errorText)
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Erro ao disparar deploy: ${response.status} - ${errorText}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Error triggering deploy:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
