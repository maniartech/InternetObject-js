import Decimal from "../src/core/decimal";

describe('Trial - Testing Add Method Improvements', () => {
  it('tests add method with scale and rounding behavior', () => {
    console.log('=== Testing Add Method Improvements ===');
    
    // Test 1: Result scale should match first operand (RDBMS-like behavior)
    console.log('\n1. Result Scale Behavior:');
    const a1 = new Decimal('123.45', 5, 2);  // Scale 2
    const b1 = new Decimal('67.890', 5, 3);  // Scale 3
    const result1 = a1.add(b1);
    console.log(`${a1.toString()} + ${b1.toString()} = ${result1.toString()}`);
    console.log(`Result scale: ${result1.getScale()} (should be 2, matching first operand)`);
    console.log(`Result precision: ${result1.getPrecision()}`);
    
    // Test 2: Rounding behavior
    console.log('\n2. Rounding Behavior:');
    const a2 = new Decimal('1.1', 3, 1);     // Scale 1
    const b2 = new Decimal('2.25', 3, 2);    // Scale 2, will be converted to scale 1
    const result2 = a2.add(b2);
    console.log(`${a2.toString()} + ${b2.toString()} = ${result2.toString()}`);
    console.log(`Result scale: ${result2.getScale()} (should be 1)`);
    console.log(`b2 converted to scale 1 should be 2.3 (rounded), so 1.1 + 2.3 = 3.4`);
    
    // Test 3: Precision overflow
    console.log('\n3. Precision Overflow Test:');
    try {
      const a3 = new Decimal('9.9', 3, 1);     // Scale 1, Precision 3
      const b3 = new Decimal('0.15', 3, 2);    // Scale 2, will be converted and rounded
      const result3 = a3.add(b3);
      console.log(`${a3.toString()} + ${b3.toString()} = ${result3.toString()}`);
      console.log(`Result digits: ${result3.getCoefficient().toString().replace('-', '').length}`);
      console.log(`Result precision: ${result3.getPrecision()}`);
    } catch (error) {
      console.log(`Error (expected): ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test 4: Large numbers with proper scale maintenance
    console.log('\n4. Large Numbers:');
    const a4 = new Decimal('123456789012345678901234567890.12', 34, 2);
    const b4 = new Decimal('987654321098765432109876543210.789', 34, 3);
    const result4 = a4.add(b4);
    console.log(`Large number addition result: ${result4.toString()}`);
    console.log(`Result scale: ${result4.getScale()} (should be 2)`);
    console.log(`Result precision: ${result4.getPrecision()}`);
    
    // Test 5: Operand conversion
    console.log('\n5. Operand Conversion:');
    const a5 = new Decimal('100.00', 5, 2);  // Precision 5, Scale 2
    const b5 = new Decimal('50.1', 3, 1);    // Precision 3, Scale 1
    const result5 = a5.add(b5);
    console.log(`${a5.toString()} + ${b5.toString()} = ${result5.toString()}`);
    console.log(`b5 should be converted to precision 5, scale 2: 50.10`);
    console.log(`Result: precision ${result5.getPrecision()}, scale ${result5.getScale()}`);
  });
});
