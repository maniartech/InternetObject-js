import Decimal from '../src/core/decimal';

describe('Decimal Addition - Precision and Scale Behavior', () => {
    test('Result inherits FIRST operand precision and scale, not common values', () => {
        // First operand: precision 6, scale 2
        const a = new Decimal('1.25', 6, 2);
        
        // Second operand: precision 4, scale 1  
        const b = new Decimal('2350.7', 4, 1);
        
        const result = a.add(b);
        
        console.log('First operand (a):', {
            value: a.toString(),
            precision: a.getPrecision(),
            scale: a.getScale()
        });
        
        console.log('Second operand (b):', {
            value: b.toString(),
            precision: b.getPrecision(),
            scale: b.getScale()
        });
        
        console.log('Result:', {
            value: result.toString(),
            precision: result.getPrecision(),
            scale: result.getScale()
        });
        
        // Result should match FIRST operand's precision and scale
        expect(result.getPrecision()).toBe(6); // Same as first operand (a)
        expect(result.getScale()).toBe(2);     // Same as first operand (a)
        expect(result.toString()).toBe('2351.95');
    });

    test('Reverse order gives different precision/scale', () => {
        // First operand: precision 4, scale 1
        const a = new Decimal('2350.7', 4, 1);
        
        // Second operand: precision 6, scale 2
        const b = new Decimal('1.25', 6, 2);
        
        const result = a.add(b);
        
        console.log('First operand (a):', {
            value: a.toString(),
            precision: a.getPrecision(),
            scale: a.getScale()
        });
        
        console.log('Result:', {
            value: result.toString(),
            precision: result.getPrecision(),
            scale: result.getScale()
        });
        
        // Result should match FIRST operand's precision and scale
        expect(result.getPrecision()).toBe(4); // Same as first operand (a)
        expect(result.getScale()).toBe(1);     // Same as first operand (a)
        expect(result.toString()).toBe('2352.0'); // Rounded to 1 decimal place
    });

    test('Same precision/scale operands', () => {
        const a = new Decimal('1.25', 5, 2);
        const b = new Decimal('2350.70', 5, 2);
        const result = a.add(b);
        
        // When both have same precision/scale, result maintains them
        expect(result.getPrecision()).toBe(5);
        expect(result.getScale()).toBe(2);
        expect(result.toString()).toBe('2351.95');
    });
});