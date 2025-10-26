// Check database structure and data
// Run this in browser console after logging in

async function checkDatabase() {
  console.log('=== DATABASE CHECK ===')
  
  // Check markets
  const { data: markets, error: marketsError } = await supabase
    .from('markets')
    .select('*')
  
  console.log('Markets:', markets)
  console.log('Markets error:', marketsError)
  
  // Check block_shop_combinations
  const { data: combinations, error: combinationsError } = await supabase
    .from('block_shop_combinations')
    .select('*')
    .limit(10)
  
  console.log('Block+Shop combinations (first 10):', combinations)
  console.log('Combinations error:', combinationsError)
  
  // Check user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single()
  
  console.log('User profile:', profile)
  console.log('Profile error:', profileError)
  
  if (profile?.selected_shop_id) {
    console.log('=== SHOP ID ANALYSIS ===')
    const shopId = profile.selected_shop_id
    console.log('Shop ID:', shopId)
    
    const firstDashIndex = shopId.indexOf('-')
    const lastDashIndex = shopId.lastIndexOf('-')
    
    if (firstDashIndex !== -1 && lastDashIndex !== -1) {
      const marketId = shopId.substring(0, firstDashIndex)
      const marketName = shopId.substring(firstDashIndex + 1, lastDashIndex)
      const blockShopCombination = shopId.substring(lastDashIndex + 1)
      
      console.log('Parsed:', { marketId, marketName, blockShopCombination })
      
      // Check if this combination exists
      const { data: exists, error: existsError } = await supabase
        .from('block_shop_combinations')
        .select('*')
        .eq('market_id', marketId)
        .eq('block_shop_code', blockShopCombination)
        .single()
      
      console.log('Combination exists:', exists)
      console.log('Exists error:', existsError)
    }
  }
}

// Run the check
checkDatabase()




