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

    // Buscar configurações
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['commission_days_to_available', 'commission_min_withdrawal']);

    const daysToAvailable = parseInt(
      settingsData?.find(s => s.key === 'commission_days_to_available')?.value || '7'
    );
    const minWithdrawal = parseFloat(
      settingsData?.find(s => s.key === 'commission_min_withdrawal')?.value || '50.00'
    );

    console.log(`⚙️ Configurações: ${daysToAvailable} dias, R$ ${minWithdrawal} mínimo`);

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

    // Agrupar comissões por afiliado
    const commissionsByAffiliate = pendingCommissions.reduce((acc, comm) => {
      if (!acc[comm.affiliate_id]) {
        acc[comm.affiliate_id] = [];
      }
      acc[comm.affiliate_id].push(comm);
      return acc;
    }, {} as Record<string, Commission[]>);

    const affiliateIds = Object.keys(commissionsByAffiliate);

    // Buscar withdrawal_day dos afiliados
    const { data: affiliatesData, error: affiliatesError } = await supabase
      .from('profiles')
      .select('id, withdrawal_day, name')
      .in('id', affiliateIds);

    if (affiliatesError) {
      console.error('❌ Erro ao buscar afiliados:', affiliatesError);
      throw affiliatesError;
    }

    // Obter o dia da semana atual (1=Seg, 2=Ter, ..., 5=Sex)
    const today = new Date();
    let currentDayOfWeek = today.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
    
    // Converter para formato 1-5
    if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
      currentDayOfWeek = 1; // Dom/Sáb = Segunda
    }

    console.log(`📆 Dia atual: ${currentDayOfWeek} (1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex)`);

    let totalProcessed = 0;
    const processResults = [];

    // Processar cada afiliado
    for (const affiliate of affiliatesData || []) {
      const affiliateCommissions = commissionsByAffiliate[affiliate.id];
      const totalAmount = affiliateCommissions.reduce((sum, c) => sum + c.amount, 0);

      console.log(`\n👤 Afiliado: ${affiliate.name} (${affiliate.id})`);
      console.log(`   - Dia de saque: ${affiliate.withdrawal_day}`);
      console.log(`   - Total pendente: R$ ${totalAmount.toFixed(2)}`);
      console.log(`   - Comissões: ${affiliateCommissions.length}`);

      // Verificar se é o dia de saque do afiliado
      if (affiliate.withdrawal_day !== currentDayOfWeek) {
        console.log(`   ⏸️ Aguardando dia de saque (dia ${affiliate.withdrawal_day})`);
        processResults.push({
          affiliate_id: affiliate.id,
          affiliate_name: affiliate.name,
          status: 'waiting_withdrawal_day',
          amount: totalAmount,
          withdrawal_day: affiliate.withdrawal_day,
          current_day: currentDayOfWeek
        });
        continue;
      }

      // Verificar se atingiu o valor mínimo
      if (totalAmount < minWithdrawal) {
        console.log(`   ⏸️ Valor abaixo do mínimo (R$ ${minWithdrawal})`);
        processResults.push({
          affiliate_id: affiliate.id,
          affiliate_name: affiliate.name,
          status: 'below_minimum',
          amount: totalAmount,
          minimum: minWithdrawal
        });
        continue;
      }

      // Atualizar status das comissões para 'available'
      const commissionIds = affiliateCommissions.map(c => c.id);
      const { error: updateError } = await supabase
        .from('commissions')
        .update({ 
          status: 'available',
          available_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', commissionIds);

      if (updateError) {
        console.error(`   ❌ Erro ao atualizar comissões:`, updateError);
        processResults.push({
          affiliate_id: affiliate.id,
          affiliate_name: affiliate.name,
          status: 'error',
          error: updateError.message
        });
        continue;
      }

      totalProcessed += affiliateCommissions.length;
      console.log(`   ✅ ${affiliateCommissions.length} comissões liberadas (R$ ${totalAmount.toFixed(2)})`);
      
      processResults.push({
        affiliate_id: affiliate.id,
        affiliate_name: affiliate.name,
        status: 'processed',
        amount: totalAmount,
        commissions_count: affiliateCommissions.length
      });
    }

    console.log(`\n🎉 Processamento concluído: ${totalProcessed} comissões liberadas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: totalProcessed,
        total_pending: pendingCommissions.length,
        details: processResults,
        config: {
          days_to_available: daysToAvailable,
          min_withdrawal: minWithdrawal,
          current_day: currentDayOfWeek
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
