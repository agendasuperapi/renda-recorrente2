import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔧 Iniciando reconfiguração do cron job...')

    // Buscar a configuração atual
    const { data: settingData, error: settingError } = await supabaseClient
      .from('app_settings')
      .select('value')
      .eq('key', 'commission_check_schedule')
      .single()

    if (settingError) {
      console.error('❌ Erro ao buscar configuração:', settingError)
      throw settingError
    }

    const scheduleConfig = settingData?.value || 'hourly'
    console.log('📋 Configuração encontrada:', scheduleConfig)

    // Converter para formato cron
    let cronSchedule: string
    if (scheduleConfig === 'hourly') {
      cronSchedule = '0 * * * *' // A cada hora
    } else {
      // Formato HH:MM
      const [hours, minutes] = scheduleConfig.split(':')
      cronSchedule = `${minutes} ${hours} * * *`
    }

    console.log('⏰ Cron schedule:', cronSchedule)

    // Remover job existente
    const { error: unscheduleError } = await supabaseClient.rpc('cron.unschedule', {
      job_name: 'process-commission-status-hourly'
    }).single()

    if (unscheduleError && !unscheduleError.message.includes('does not exist')) {
      console.warn('⚠️ Aviso ao remover job:', unscheduleError)
    } else {
      console.log('🗑️ Job antigo removido')
    }

    // Criar novo job
    const cronCommand = `
      SELECT
        net.http_post(
            url:='${Deno.env.get('SUPABASE_URL')}/functions/v1/process-commission-status',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}"}'::jsonb,
            body:=concat('{"triggered_at": "', now(), '"}')::jsonb
        ) as request_id;
    `

    const { error: scheduleError } = await supabaseClient.rpc('cron.schedule', {
      job_name: 'process-commission-status-hourly',
      schedule: cronSchedule,
      command: cronCommand
    })

    if (scheduleError) {
      console.error('❌ Erro ao criar job:', scheduleError)
      throw scheduleError
    }

    console.log('✅ Cron job criado com sucesso!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cron job reconfigurado com sucesso',
        schedule: cronSchedule,
        config: scheduleConfig
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Erro geral:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
