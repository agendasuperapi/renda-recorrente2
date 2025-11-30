import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Commission {
  id: string;
  affiliate_id: string;
  amount: number;
  payment_date: string;
  status: string;
}

interface AffiliateWithDay {
  id: string;
  withdrawal_day: number;
  name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Iniciando processamento de comissões...');

    // Buscar apenas configuração de dias
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('key, value')
      .eq('key', 'commission_days_to_available');

    const daysToAvailable = parseInt(
      settingsData?.[0]?.value || '7'
    );

    console.log(`⚙️ Configuração: ${daysToAvailable} dias para disponibilização`);

    // Calcular a data limite (hoje - X dias)
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - daysToAvailable);
    const limitDateStr = limitDate.toISOString().split('T')[0];

    console.log(`📅 Data limite para comissões: ${limitDateStr}`);

    // Buscar comissões pendentes que já passaram do prazo
    const { data: pendingCommissions, error: commissionsError } = await supabase
      .from('commissions')
      .select('id, affiliate_id, amount, payment_date, status')
      .eq('status', 'pending')
      .lte('payment_date', limitDateStr + 'T23:59:59.999Z');

    if (commissionsError) {
      console.error('❌ Erro ao buscar comissões:', commissionsError);
      throw commissionsError;
    }

    if (!pendingCommissions || pendingCommissions.length === 0) {
      console.log('✅ Nenhuma comissão pendente para processar');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma comissão para processar',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📊 Encontradas ${pendingCommissions.length} comissões pendentes`);

    // Atualizar todas as comissões para 'available' (sem verificações adicionais)
    const commissionIds = pendingCommissions.map(c => c.id);
    const { error: updateError } = await supabase
      .from('commissions')
      .update({ 
        status: 'available',
        available_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', commissionIds);

    if (updateError) {
      console.error('❌ Erro ao atualizar comissões:', updateError);
      throw updateError;
    }

    const totalProcessed = pendingCommissions.length;
    console.log(`✅ ${totalProcessed} comissões liberadas`);

    // Agrupar resultados por afiliado para estatísticas
    const commissionsByAffiliate = pendingCommissions.reduce((acc, comm) => {
      if (!acc[comm.affiliate_id]) {
        acc[comm.affiliate_id] = { count: 0, total: 0 };
      }
      acc[comm.affiliate_id].count++;
      acc[comm.affiliate_id].total += comm.amount;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    const processResults = Object.entries(commissionsByAffiliate).map(([affiliateId, data]) => ({
      affiliate_id: affiliateId,
      status: 'processed',
      commissions_count: data.count,
      amount: data.total
    }));

    console.log(`\n🎉 Processamento concluído: ${totalProcessed} comissões liberadas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: totalProcessed,
        total_pending: pendingCommissions.length,
        details: processResults,
        config: {
          days_to_available: daysToAvailable
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
