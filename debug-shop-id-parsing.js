// Debug script to test shop ID parsing
// Run this in browser console to test the parsing logic

function parseShopId(shopId) {
  console.log('Parsing shop ID:', shopId)
  
  const firstDashIndex = shopId.indexOf('-')
  const lastDashIndex = shopId.lastIndexOf('-')
  
  if (firstDashIndex === -1 || lastDashIndex === -1 || firstDashIndex === lastDashIndex) {
    console.error('Invalid shop ID format:', shopId)
    return null
  }
  
  const marketId = shopId.substring(0, firstDashIndex)
  const marketName = shopId.substring(firstDashIndex + 1, lastDashIndex)
  const blockShopCombination = shopId.substring(lastDashIndex + 1)
  
  console.log('Parsed shop ID:', { marketId, marketName, blockShopCombination })
  
  // Extract block letter and shop number from combination
  const blockLetter = blockShopCombination.match(/^[A-Z]/)?.[0] || 'Unknown'
  const shopNumber = blockShopCombination.replace(/^[A-Z]/, '') || 'Unknown'
  
  return {
    marketId,
    marketName,
    blockShopCombination,
    blockLetter,
    shopNumber
  }
}

// Test with your actual shop ID
const testShopId = "Unknown4202-839a-b2a591187de5-Market 1-B52"
const result = parseShopId(testShopId)
console.log('Result:', result)

// Expected output should be:
// {
//   marketId: "Unknown4202-839a-b2a591187de5",
//   marketName: "Market 1", 
//   blockShopCombination: "B52",
//   blockLetter: "B",
//   shopNumber: "52"
// }

