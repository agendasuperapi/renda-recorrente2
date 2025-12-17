import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotifyRequest {
  email: string
  failed_count: number
  ip_address?: string
  is_blocked: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { email, failed_count, ip_address, is_blocked }: NotifyRequest = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user exists in profiles by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('email', email.toLowerCase())
      .single()

    // Build email content
    const subject = is_blocked 
      ? '🚨 Alerta de Segurança: Sua conta foi bloqueada'
      : '⚠️ Alerta de Segurança: Tentativas suspeitas de login'

    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">
            ${is_blocked ? '🚨 Conta Bloqueada' : '⚠️ Alerta de Segurança'}
          </h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin-top: 0;">Olá${profile?.name ? `, ${profile.name}` : ''},</p>
          
          ${is_blocked ? `
            <p style="color: #dc2626; font-weight: bold;">
              Sua conta foi bloqueada após ${failed_count} tentativas de login incorretas.
            </p>
            <p>
              Por motivos de segurança, o acesso à sua conta foi temporariamente suspenso. 
              Se você não fez essas tentativas, isso pode indicar que alguém está tentando acessar sua conta.
            </p>
            <p>
              <strong>O que fazer agora:</strong>
            </p>
            <ul>
              <li>Entre em contato com nosso suporte para desbloquear sua conta</li>
              <li>Considere alterar sua senha assim que recuperar o acesso</li>
              <li>Verifique se seu email não foi comprometido</li>
            </ul>
          ` : `
            <p>
              Detectamos <strong>${failed_count} tentativas de login incorretas</strong> na sua conta.
            </p>
            <p>
              Se foi você que tentou acessar, não se preocupe - apenas certifique-se de usar a senha correta.
              Se não foi você, recomendamos que altere sua senha imediatamente.
            </p>
          `}
          
          <div style="background: #fff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              <strong>Detalhes:</strong><br>
              📧 Email: ${email}<br>
              📅 Data/Hora: ${now}<br>
              ${ip_address ? `🌐 IP: ${ip_address}<br>` : ''}
              🔢 Tentativas: ${failed_count}
            </p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
            Se você não reconhece essa atividade, por favor entre em contato conosco imediatamente.
          </p>
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">
          Este é um email automático de segurança. Por favor, não responda.
        </p>
      </body>
      </html>
    `

    // Use Supabase's built-in email sending via Auth Admin API
    // Since we don't have a dedicated email service, we'll log this and 
    // create an activity record for admin visibility
    console.log(`[SECURITY ALERT] Suspicious login for ${email}:`, {
      failed_count,
      ip_address,
      is_blocked,
      timestamp: now
    })

    // Create activity log for this security event
    if (profile?.id) {
      await supabase.from('activities').insert({
        user_id: profile.id,
        activity_type: is_blocked ? 'account_blocked' : 'suspicious_login_attempt',
        description: is_blocked 
          ? `Conta bloqueada após ${failed_count} tentativas de login incorretas`
          : `${failed_count} tentativas de login incorretas detectadas`,
        category: 'security',
        ip_address: ip_address || null,
        metadata: {
          email,
          failed_count,
          is_blocked,
          timestamp: now
        }
      })
    }

    // Create notification for admin
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin')

    if (adminUsers && adminUsers.length > 0) {
      const notifications = adminUsers.map(admin => ({
        user_id: admin.user_id,
        title: is_blocked ? '🚨 Conta Bloqueada' : '⚠️ Tentativas Suspeitas',
        body: is_blocked 
          ? `Conta ${email} bloqueada após ${failed_count} tentativas`
          : `${failed_count} tentativas incorretas para ${email}`,
        type: is_blocked ? 'account_blocked' : 'suspicious_login',
        icon: is_blocked ? '🚨' : '⚠️',
        action_url: '/admin/settings?tab=blocked'
      }))

      await supabase.from('notifications').insert(notifications)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Security alert processed',
        email_content_preview: subject
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error processing suspicious login notification:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})