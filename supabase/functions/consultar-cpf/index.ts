import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CpfApi {
  id: string;
  name: string;
  url: string;
  api_type: 'nationalId' | 'spbt' | 'betQuatro' | 'superbet';
  is_active: boolean;
  priority: number;
}

async function consultNationalId(url: string, cpf: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nationalId: cpf,
      skinId: 192347
    }),
  });

  if (!response.ok) throw new Error('API request failed');
  
  const data = await response.json();
  
  if (!data.success) throw new Error('API returned error');
  
  return {
    name: `${data.inputFields.firstname} ${data.inputFields.lastname}`.trim(),
    birthDate: data.inputFields.birthDate,
    gender: data.inputFields.gender,
  };
}

async function consultSpbt(url: string, cpf: string, birthDate: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paramDataNascimento: birthDate,
      paramCPF: cpf
    }),
  });

  if (!response.ok) throw new Error('API request failed');
  
  const data = await response.json();
  
  if (data.error || !data.result) throw new Error('API returned error');
  
  return {
    name: data.data.name,
  };
}

async function consultBetQuatro(url: string, cpf: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: "email@gmail.com",
      countryId: cpf
    }),
  });

  if (!response.ok) throw new Error('API request failed');
  
  const data = await response.json();
  
  if (data.error) throw new Error('API returned error');
  
  return {
    name: data.data.fullName,
    birthDate: data.data.birthDate,
  };
}

async function consultSuperbet(url: string, cpf: string, birthDate: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: "CPF",
      dateOfBirth: birthDate,
      documentNumber: cpf,
      clientSourceType: "Desktop_new"
    }),
  });

  if (!response.ok) throw new Error('API request failed');
  
  const data = await response.json();
  
  if (data.error) throw new Error('API returned error');
  
  return {
    name: data.data.name,
  };
}

async function consultCpfApi(api: CpfApi, cpf: string, birthDate: string) {
  console.log(`Trying API: ${api.name} (${api.api_type})`);
  
  try {
    let result;
    
    switch (api.api_type) {
      case 'nationalId':
        result = await consultNationalId(api.url, cpf);
        break;
      case 'spbt':
        result = await consultSpbt(api.url, cpf, birthDate);
        break;
      case 'betQuatro':
        result = await consultBetQuatro(api.url, cpf);
        break;
      case 'superbet':
        result = await consultSuperbet(api.url, cpf, birthDate);
        break;
      default:
        throw new Error('Unknown API type');
    }
    
    console.log(`Success with API: ${api.name}`);
    return { ...result, apiUsed: api.name };
  } catch (error) {
    console.error(`Failed with API ${api.name}:`, error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cpf, birthDate } = await req.json();

    if (!cpf) {
      throw new Error('CPF is required');
    }

    // Clean CPF
    const cleanCpf = cpf.replace(/\D/g, '');
    
    if (cleanCpf.length !== 11) {
      throw new Error('Invalid CPF format');
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch active APIs ordered by priority
    const { data: apis, error: dbError } = await supabase
      .from('cpf_apis')
      .select('*')
      .eq('is_active', true)
      .order('priority');

    if (dbError) throw dbError;

    if (!apis || apis.length === 0) {
      throw new Error('No active APIs configured');
    }

    // Try each API in order until one succeeds
    let lastError;
    for (const api of apis) {
      try {
        const result = await consultCpfApi(api, cleanCpf, birthDate);
        return new Response(
          JSON.stringify(result),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (error) {
        lastError = error;
        console.log(`Failed with ${api.name}, trying next...`);
        continue;
      }
    }

    // If all APIs failed
    const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
    throw new Error(`All APIs failed. Last error: ${errorMessage}`);

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
