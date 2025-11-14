import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Utility function to handle membership upgrades
export async function upgradeMembership(customerId, newPlanId, oldPlanId = null) {
  const supabase = createClientComponentClient();
  
  try {
    // If we have the old plan ID, fetch current membership details for points carryover
    let pointsToCarryForward = 0;
    
    if (oldPlanId) {
      // Fetch the current membership details
      const { data: currentMembership, error: membershipError } = await supabase
        .from('memberships')
        .select('points_balance')
        .eq('customer_id', customerId)
        .eq('plan_id', oldPlanId)
        .eq('active', true)
        .single();
      
      if (membershipError) {
        console.error('Error fetching current membership:', membershipError);
        throw membershipError;
      }
      
      // Carry forward only the remaining points balance
      if (currentMembership) {
        pointsToCarryForward = currentMembership.points_balance || 0;
      }
      
      // Deactivate the old membership
      const { error: deactivateError } = await supabase
        .from('memberships')
        .update({ active: false, updated_at: new Date() })
        .eq('customer_id', customerId)
        .eq('plan_id', oldPlanId)
        .eq('active', true);
      
      if (deactivateError) {
        console.error('Error deactivating old membership:', deactivateError);
        throw deactivateError;
      }
    }
    
    // Get the new plan details
    const { data: newPlan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', newPlanId)
      .single();
    
    if (planError) {
      console.error('Error fetching new plan:', planError);
      throw planError;
    }
    
    // Calculate initial points for the new plan (carried forward + new plan points)
    const initialPoints = pointsToCarryForward + (newPlan.points || 0);
    
    // Create the new membership
    const { error: createError } = await supabase
      .from('memberships')
      .insert({
        customer_id: customerId,
        plan_id: newPlanId,
        membership_type: newPlan.tier,
        start_date: new Date(),
        end_date: new Date(new Date().setMonth(new Date().getMonth() + newPlan.duration_months)),
        points_balance: initialPoints,
        active: true
      });
    
    if (createError) {
      console.error('Error creating new membership:', createError);
      throw createError;
    }
    
    // Update customer with new membership type
    const { error: updateCustomerError } = await supabase
      .from('customers')
      .update({ 
        membership_type: newPlan.tier,
        updated_at: new Date()
      })
      .eq('id', customerId);
    
    if (updateCustomerError) {
      console.error('Error updating customer:', updateCustomerError);
      throw updateCustomerError;
    }
    
    return {
      success: true,
      message: `Successfully upgraded to ${newPlan.name} with ${initialPoints} points (including ${pointsToCarryForward} carried forward)`,
      newPlan: newPlan
    };
    
  } catch (error) {
    console.error('Membership upgrade failed:', error);
    return {
      success: false,
      message: 'Membership upgrade failed. Please try again.',
      error: error
    };
  }
} 