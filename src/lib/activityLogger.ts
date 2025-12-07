import { supabase } from "@/integrations/supabase/client";

export type ActivityCategory = 
  | 'profile' 
  | 'security' 
  | 'coupon' 
  | 'financial' 
  | 'goal' 
  | 'subscription' 
  | 'support' 
  | 'auth';

export type ActivityType =
  // Profile
  | 'username_changed'
  | 'avatar_changed'
  | 'profile_updated'
  | 'address_updated'
  | 'social_updated'
  // Security
  | 'password_changed'
  | 'account_deleted'
  | 'login'
  | 'logout'
  // Coupon
  | 'coupon_activated'
  | 'coupon_deactivated'
  | 'coupon_custom_code_changed'
  // Financial
  | 'withdrawal_requested'
  | 'withdrawal_status_approved'
  | 'withdrawal_status_rejected'
  | 'withdrawal_status_paid'
  // Goal
  | 'goal_created'
  | 'goal_updated'
  | 'goal_deleted'
  // Subscription
  | 'subscription_created'
  | 'subscription_status_active'
  | 'subscription_status_canceled'
  | 'plan_changed'
  | 'cancellation_requested'
  | 'cancellation_reverted'
  // Support
  | 'ticket_created'
  | 'ticket_closed'
  | 'ticket_reopened';

interface LogActivityParams {
  userId: string;
  activityType: ActivityType | string;
  description: string;
  category: ActivityCategory;
  metadata?: Record<string, unknown>;
}

/**
 * Registra uma atividade do usuário no sistema
 * 
 * @param params - Parâmetros da atividade
 * @returns Promise<boolean> - true se registrado com sucesso
 */
export async function logActivity({
  userId,
  activityType,
  description,
  category,
  metadata = {}
}: LogActivityParams): Promise<boolean> {
  try {
    const enrichedMetadata = {
      ...metadata,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase.from('activities').insert({
      user_id: userId,
      activity_type: activityType,
      description,
      category,
      metadata: enrichedMetadata,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });

    if (error) {
      console.error('Erro ao registrar atividade:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao registrar atividade:', error);
    return false;
  }
}

/**
 * Helper para obter descrição legível do tipo de atividade
 */
export function getActivityTypeLabel(activityType: string): string {
  const labels: Record<string, string> = {
    // Profile
    username_changed: 'Alterou username',
    avatar_changed: 'Alterou foto de perfil',
    profile_updated: 'Atualizou dados pessoais',
    address_updated: 'Atualizou endereço',
    social_updated: 'Atualizou redes sociais',
    // Security
    password_changed: 'Alterou senha',
    account_deleted: 'Excluiu conta',
    login: 'Login realizado',
    logout: 'Logout realizado',
    // Coupon
    coupon_activated: 'Ativou cupom',
    coupon_deactivated: 'Inativou cupom',
    coupon_custom_code_changed: 'Alterou código personalizado do cupom',
    // Financial
    withdrawal_requested: 'Solicitou saque',
    withdrawal_status_approved: 'Saque aprovado',
    withdrawal_status_rejected: 'Saque rejeitado',
    withdrawal_status_paid: 'Saque pago',
    withdrawal_status_pending: 'Saque solicitado',
    // Goal
    goal_created: 'Criou meta',
    goal_updated: 'Editou meta',
    goal_deleted: 'Excluiu meta',
    // Subscription
    subscription_created: 'Assinatura criada',
    subscription_status_active: 'Assinatura ativada',
    subscription_status_canceled: 'Assinatura cancelada',
    subscription_status_past_due: 'Pagamento atrasado',
    subscription_status_trialing: 'Período de teste',
    plan_changed: 'Mudou de plano',
    cancellation_requested: 'Solicitou cancelamento',
    cancellation_reverted: 'Desfez cancelamento',
    // Support
    ticket_created: 'Abriu chamado de suporte',
    ticket_closed: 'Encerrou chamado',
    ticket_reopened: 'Reabriu chamado',
  };

  return labels[activityType] || activityType;
}

/**
 * Helper para obter ícone da categoria
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    profile: '👤',
    security: '🔒',
    coupon: '🎫',
    financial: '💰',
    goal: '🎯',
    subscription: '📋',
    support: '💬',
    auth: '🔑',
  };

  return icons[category] || '📝';
}

/**
 * Helper para obter cor da categoria (tailwind class)
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    profile: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    security: 'bg-red-500/10 text-red-500 border-red-500/20',
    coupon: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    financial: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    goal: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    subscription: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    support: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    auth: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  };

  return colors[category] || 'bg-muted text-muted-foreground';
}
