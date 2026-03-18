// Test hash extraction function
function extractHash(ipfsHash: string): string {
  if (ipfsHash.startsWith('ipfs://')) {
    return ipfsHash.replace('ipfs://', '');
  }
  return ipfsHash;
}

function testHashExtraction() {
  console.log("🧪 Testing hash extraction function...");
  
  const testCases = [
    {
      input: "ipfs://Qmepw3bzzNjbewrKRQkMb3ZXRoeAWhoGvwU4ksjmG4PMHq",
      expected: "Qmepw3bzzNjbewrKRQkMb3ZXRoeAWhoGvwU4ksjmG4PMHq"
    },
    {
      input: "Qmepw3bzzNjbewrKRQkMb3ZXRoeAWhoGvwU4ksjmG4PMHq",
      expected: "Qmepw3bzzNjbewrKRQkMb3ZXRoeAWhoGvwU4ksjmG4PMHq"
    },
    {
      input: "ipfs://bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
      expected: "bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku"
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = extractHash(testCase.input);
    const passed = result === testCase.expected;
    
    console.log(`Test ${index + 1}:`);
    console.log(`  Input: ${testCase.input}`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Result: ${result}`);
    console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
  });
  
  // Test URL generation
  const ipHash = "ipfs://Qmepw3bzzNjbewrKRQkMb3ZXRoeAWhoGvwU4ksjmG4PMHq";
  const extractedHash = extractHash(ipHash);
  const url = `https://ipfs.io/ipfs/${extractedHash}`;
  
  console.log("🔗 URL Generation Test:");
  console.log(`  Original hash: ${ipHash}`);
  console.log(`  Extracted hash: ${extractedHash}`);
  console.log(`  Generated URL: ${url}`);
  console.log(`  URL Status: ${url === 'https://ipfs.io/ipfs/Qmepw3bzzNjbewrKRQkMb3ZXRoeAWhoGvwU4ksjmG4PMHq' ? '✅ PASS' : '❌ FAIL'}`);
}

testHashExtraction(); 