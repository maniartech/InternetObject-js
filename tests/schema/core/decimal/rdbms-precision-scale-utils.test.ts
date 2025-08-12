import {
    calculateAdditionResultPrecisionScale,
    calculateMultiplicationResultPrecisionScale,
    calculateDivisionResultPrecisionScale,
    validateAndAdjustPrecisionScale,
    calculateRdbmsArithmeticResult,
    RdbmsArithmeticResult
} from '../../../../src/core/decimal-utils';

describe('RDBMS Precision and Scale Utility Functions', () => {

    describe('calculateAdditionResultPrecisionScale', () => {

        describe('Basic Addition Cases', () => {
            test('same precision and scale', () => {
                const result = calculateAdditionResultPrecisionScale(5, 2, 5, 2);
                expect(result.scale).toBe(2); // max(2, 2) = 2
                expect(result.precision).toBe(6); // max(3, 3) + 2 + 1 = 6
            });

            test('different scales, same precision', () => {
                const result = calculateAdditionResultPrecisionScale(5, 2, 5, 1);
                expect(result.scale).toBe(2); // max(2, 1) = 2
                expect(result.precision).toBe(7); // max(3, 4) + 2 + 1 = 7
            });

            test('different precisions and scales', () => {
                const result = calculateAdditionResultPrecisionScale(10, 4, 8, 2);
                expect(result.scale).toBe(4); // max(4, 2) = 4
                expect(result.precision).toBe(11); // max(6, 6) + 4 + 1 = 11
            });

            test('zero scale (integers)', () => {
                const result = calculateAdditionResultPrecisionScale(5, 0, 3, 0);
                expect(result.scale).toBe(0); // max(0, 0) = 0
                expect(result.precision).toBe(6); // max(5, 3) + 0 + 1 = 6
            });

            test('one operand with zero scale', () => {
                const result = calculateAdditionResultPrecisionScale(5, 0, 6, 3);
                expect(result.scale).toBe(3); // max(0, 3) = 3
                expect(result.precision).toBe(9); // max(5, 3) + 3 + 1 = 9
            });
        });

        describe('Large Number Cases', () => {
            test('very large precisions', () => {
                const result = calculateAdditionResultPrecisionScale(50, 10, 60, 15);
                expect(result.scale).toBe(15); // max(10, 15) = 15
                expect(result.precision).toBe(61); // max(40, 45) + 15 + 1 = 61
            });

            test('maximum scale scenarios', () => {
                const result = calculateAdditionResultPrecisionScale(38, 37, 38, 36);
                expect(result.scale).toBe(37); // max(37, 36) = 37
                expect(result.precision).toBe(40); // max(1, 2) + 37 + 1 = 40
            });

            test('asymmetric large numbers', () => {
                const result = calculateAdditionResultPrecisionScale(100, 2, 10, 8);
                expect(result.scale).toBe(8); // max(2, 8) = 8
                expect(result.precision).toBe(107); // max(98, 2) + 8 + 1 = 107
            });
        });

        describe('Edge Cases', () => {
            test('minimum valid values', () => {
                const result = calculateAdditionResultPrecisionScale(1, 0, 1, 0);
                expect(result.scale).toBe(0);
                expect(result.precision).toBe(2); // max(1, 1) + 0 + 1 = 2
            });

            test('maximum scale equals precision', () => {
                const result = calculateAdditionResultPrecisionScale(5, 5, 3, 3);
                expect(result.scale).toBe(5); // max(5, 3) = 5
                expect(result.precision).toBe(6); // max(0, 0) + 5 + 1 = 6
            });

            test('very different operand sizes', () => {
                const result = calculateAdditionResultPrecisionScale(2, 1, 20, 10);
                expect(result.scale).toBe(10); // max(1, 10) = 10
                expect(result.precision).toBe(21); // max(1, 10) + 10 + 1 = 21
            });
        });

        describe('Error Cases', () => {
            test('invalid precision (zero)', () => {
                expect(() => calculateAdditionResultPrecisionScale(0, 0, 5, 2))
                    .toThrow('Precision must be positive');
            });

            test('invalid precision (negative)', () => {
                expect(() => calculateAdditionResultPrecisionScale(-1, 0, 5, 2))
                    .toThrow('Precision must be positive');
            });

            test('invalid scale (negative)', () => {
                expect(() => calculateAdditionResultPrecisionScale(5, -1, 5, 2))
                    .toThrow('Scale must be non-negative');
            });

            test('scale exceeds precision', () => {
                expect(() => calculateAdditionResultPrecisionScale(5, 6, 5, 2))
                    .toThrow('Scale must not exceed precision');
            });
        });
    });

    describe('calculateMultiplicationResultPrecisionScale', () => {

        describe('Basic Multiplication Cases', () => {
            test('simple multiplication', () => {
                const result = calculateMultiplicationResultPrecisionScale(5, 2, 4, 1);
                expect(result.scale).toBe(3); // 2 + 1 = 3
                expect(result.precision).toBe(10); // 5 + 4 + 1 = 10
            });

            test('zero scales (integers)', () => {
                const result = calculateMultiplicationResultPrecisionScale(5, 0, 3, 0);
                expect(result.scale).toBe(0); // 0 + 0 = 0
                expect(result.precision).toBe(9); // 5 + 3 + 1 = 9
            });

            test('high precision multiplication', () => {
                const result = calculateMultiplicationResultPrecisionScale(10, 4, 8, 3);
                expect(result.scale).toBe(7); // 4 + 3 = 7
                expect(result.precision).toBe(19); // 10 + 8 + 1 = 19
            });
        });

        describe('Large Number Cases', () => {
            test('very large precisions', () => {
                const result = calculateMultiplicationResultPrecisionScale(50, 10, 40, 8);
                expect(result.scale).toBe(18); // 10 + 8 = 18
                expect(result.precision).toBe(91); // 50 + 40 + 1 = 91
            });

            test('maximum scale scenarios', () => {
                const result = calculateMultiplicationResultPrecisionScale(20, 19, 15, 14);
                expect(result.scale).toBe(33); // 19 + 14 = 33
                expect(result.precision).toBe(36); // 20 + 15 + 1 = 36
            });
        });

        describe('Edge Cases', () => {
            test('minimum valid values', () => {
                const result = calculateMultiplicationResultPrecisionScale(1, 0, 1, 0);
                expect(result.scale).toBe(0);
                expect(result.precision).toBe(3); // 1 + 1 + 1 = 3
            });

            test('one operand with maximum scale', () => {
                const result = calculateMultiplicationResultPrecisionScale(5, 5, 3, 0);
                expect(result.scale).toBe(5); // 5 + 0 = 5
                expect(result.precision).toBe(9); // 5 + 3 + 1 = 9
            });
        });
    });

    describe('calculateDivisionResultPrecisionScale', () => {

        describe('Basic Division Cases', () => {
            test('simple division with default min scale', () => {
                const result = calculateDivisionResultPrecisionScale(10, 2, 5, 1);
                expect(result.scale).toBe(Math.max(6, 2 + 5 + 1)); // max(6, 8) = 8
                expect(result.precision).toBe(8 + 1 + 8); // (10-2) + 1 + 8 = 17
            });

            test('division with custom min scale', () => {
                const result = calculateDivisionResultPrecisionScale(10, 2, 5, 1, 10);
                expect(result.scale).toBe(Math.max(10, 2 + 5 + 1)); // max(10, 8) = 10
                expect(result.precision).toBe(8 + 1 + 10); // (10-2) + 1 + 10 = 19
            });

            test('division with zero min scale', () => {
                const result = calculateDivisionResultPrecisionScale(8, 2, 4, 1, 0);
                expect(result.scale).toBe(Math.max(0, 2 + 4 + 1)); // max(0, 7) = 7
                expect(result.precision).toBe(6 + 1 + 7); // (8-2) + 1 + 7 = 14
            });
        });

        describe('Large Number Cases', () => {
            test('very large precisions', () => {
                const result = calculateDivisionResultPrecisionScale(50, 10, 30, 5);
                const expectedScale = Math.max(6, 10 + 30 + 1); // max(6, 41) = 41
                expect(result.scale).toBe(expectedScale);
                expect(result.precision).toBe(40 + 5 + expectedScale); // (50-10) + 5 + 41 = 86
            });

            test('high scale division', () => {
                const result = calculateDivisionResultPrecisionScale(20, 15, 10, 8, 12);
                const expectedScale = Math.max(12, 15 + 10 + 1); // max(12, 26) = 26
                expect(result.scale).toBe(expectedScale);
                expect(result.precision).toBe(5 + 8 + expectedScale); // (20-15) + 8 + 26 = 39
            });
        });

        describe('Edge Cases', () => {
            test('integer division', () => {
                const result = calculateDivisionResultPrecisionScale(5, 0, 3, 0);
                expect(result.scale).toBe(Math.max(6, 0 + 3 + 1)); // max(6, 4) = 6
                expect(result.precision).toBe(5 + 0 + 6); // 5 + 0 + 6 = 11
            });

            test('dividend smaller than divisor precision', () => {
                const result = calculateDivisionResultPrecisionScale(3, 1, 10, 2);
                const expectedScale = Math.max(6, 1 + 10 + 1); // max(6, 12) = 12
                expect(result.scale).toBe(expectedScale);
                expect(result.precision).toBe(2 + 2 + expectedScale); // (3-1) + 2 + 12 = 16
            });
        });
    });

    describe('validateAndAdjustPrecisionScale', () => {

        describe('Within Limits Cases', () => {
            test('values within default limits', () => {
                const result = validateAndAdjustPrecisionScale(20, 5);
                expect(result.precision).toBe(20);
                expect(result.scale).toBe(5);
            });

            test('values at exact limits', () => {
                const result = validateAndAdjustPrecisionScale(38, 38);
                expect(result.precision).toBe(38);
                expect(result.scale).toBe(38);
            });

            test('values within custom limits', () => {
                const result = validateAndAdjustPrecisionScale(15, 8, 20, 10);
                expect(result.precision).toBe(15);
                expect(result.scale).toBe(8);
            });
        });

        describe('Adjustment Cases', () => {
            test('precision exceeds limit', () => {
                const result = validateAndAdjustPrecisionScale(50, 10, 38);
                expect(result.precision).toBe(38);
                expect(result.scale).toBe(10);
            });

            test('scale exceeds limit', () => {
                const result = validateAndAdjustPrecisionScale(20, 15, 38, 10);
                expect(result.precision).toBe(20);
                expect(result.scale).toBe(10);
            });

            test('both exceed limits', () => {
                const result = validateAndAdjustPrecisionScale(50, 45, 30, 20);
                expect(result.precision).toBe(30);
                expect(result.scale).toBe(20);
            });

            test('scale exceeds adjusted precision', () => {
                const result = validateAndAdjustPrecisionScale(50, 40, 35);
                expect(result.precision).toBe(35);
                expect(result.scale).toBe(34); // Adjusted to precision - 1
            });

            test('scale equals adjusted precision', () => {
                const result = validateAndAdjustPrecisionScale(40, 40, 30);
                expect(result.precision).toBe(30);
                expect(result.scale).toBe(29); // Adjusted to precision - 1
            });
        });

        describe('Error Cases', () => {
            test('invalid precision', () => {
                expect(() => validateAndAdjustPrecisionScale(0, 5))
                    .toThrow('Precision must be positive');
            });

            test('invalid scale', () => {
                expect(() => validateAndAdjustPrecisionScale(10, -1))
                    .toThrow('Scale must be non-negative');
            });

            test('scale exceeds precision', () => {
                expect(() => validateAndAdjustPrecisionScale(5, 6))
                    .toThrow('Scale must not exceed precision');
            });
        });
    });

    describe('calculateRdbmsArithmeticResult', () => {

        describe('Addition Operations', () => {
            test('basic addition', () => {
                const result = calculateRdbmsArithmeticResult('add', 5, 2, 4, 1);
                expect(result.scale).toBe(2); // max(2, 1) = 2
                expect(result.precision).toBe(6); // max(3, 3) + 2 + 1 = 6
            });

            test('addition with adjustment', () => {
                const result = calculateRdbmsArithmeticResult('add', 50, 10, 40, 8, { maxPrecision: 30 });
                expect(result.precision).toBe(30); // Adjusted from calculated value
                expect(result.scale).toBe(10); // max(10, 8) = 10
            });
        });

        describe('Subtraction Operations', () => {
            test('basic subtraction', () => {
                const result = calculateRdbmsArithmeticResult('subtract', 8, 3, 6, 2);
                expect(result.scale).toBe(3); // max(3, 2) = 3
                expect(result.precision).toBe(9); // max(5, 4) + 3 + 1 = 9
            });
        });

        describe('Multiplication Operations', () => {
            test('basic multiplication', () => {
                const result = calculateRdbmsArithmeticResult('multiply', 6, 2, 4, 1);
                expect(result.scale).toBe(3); // 2 + 1 = 3
                expect(result.precision).toBe(11); // 6 + 4 + 1 = 11
            });

            test('multiplication with adjustment', () => {
                const result = calculateRdbmsArithmeticResult('multiply', 30, 10, 25, 8, { maxPrecision: 38 });
                expect(result.scale).toBe(18); // 10 + 8 = 18
                expect(result.precision).toBe(38); // Adjusted from 56 to 38
            });
        });

        describe('Division Operations', () => {
            test('basic division', () => {
                const result = calculateRdbmsArithmeticResult('divide', 10, 2, 5, 1);
                const expectedScale = Math.max(6, 2 + 5 + 1); // max(6, 8) = 8
                expect(result.scale).toBe(expectedScale);
                expect(result.precision).toBe(8 + 1 + expectedScale); // (10-2) + 1 + 8 = 17
            });

            test('division with custom min scale', () => {
                const result = calculateRdbmsArithmeticResult('divide', 12, 3, 6, 2, { divisionMinScale: 10 });
                const expectedScale = Math.max(10, 3 + 6 + 1); // max(10, 10) = 10
                expect(result.scale).toBe(expectedScale);
                expect(result.precision).toBe(9 + 2 + expectedScale); // (12-3) + 2 + 10 = 21
            });
        });

        describe('Error Cases', () => {
            test('unsupported operation', () => {
                expect(() => calculateRdbmsArithmeticResult('modulo' as any, 5, 2, 3, 1))
                    .toThrow('Unsupported operation: modulo');
            });
        });
    });

    describe('Real-world RDBMS Examples', () => {

        describe('SQL Server Examples', () => {
            test('DECIMAL(10,4) + DECIMAL(8,2)', () => {
                const result = calculateRdbmsArithmeticResult('add', 10, 4, 8, 2);
                expect(result.scale).toBe(4); // max(4, 2) = 4
                expect(result.precision).toBe(11); // max(6, 6) + 4 + 1 = 11
            });

            test('DECIMAL(5,2) * DECIMAL(3,1)', () => {
                const result = calculateRdbmsArithmeticResult('multiply', 5, 2, 3, 1);
                expect(result.scale).toBe(3); // 2 + 1 = 3
                expect(result.precision).toBe(9); // 5 + 3 + 1 = 9
            });
        });

        describe('PostgreSQL Examples', () => {
            test('NUMERIC(12,6) + NUMERIC(8,3)', () => {
                const result = calculateRdbmsArithmeticResult('add', 12, 6, 8, 3);
                expect(result.scale).toBe(6); // max(6, 3) = 6
                expect(result.precision).toBe(13); // max(6, 5) + 6 + 1 = 13
            });

            test('NUMERIC(15,4) / NUMERIC(6,2)', () => {
                const result = calculateRdbmsArithmeticResult('divide', 15, 4, 6, 2);
                const expectedScale = Math.max(6, 4 + 6 + 1); // max(6, 11) = 11
                expect(result.scale).toBe(expectedScale);
                expect(result.precision).toBe(11 + 2 + expectedScale); // (15-4) + 2 + 11 = 24
            });
        });

        describe('Oracle Examples', () => {
            test('NUMBER(10,2) + NUMBER(8,4)', () => {
                const result = calculateRdbmsArithmeticResult('add', 10, 2, 8, 4);
                expect(result.scale).toBe(4); // max(2, 4) = 4
                expect(result.precision).toBe(13); // max(8, 4) + 4 + 1 = 13
            });

            test('NUMBER(20,8) * NUMBER(15,6)', () => {
                const result = calculateRdbmsArithmeticResult('multiply', 20, 8, 15, 6);
                expect(result.scale).toBe(14); // 8 + 6 = 14
                expect(result.precision).toBe(36); // 20 + 15 + 1 = 36
            });
        });
    });

    describe('Extreme Edge Cases', () => {

        test('maximum precision operations', () => {
            const result = calculateRdbmsArithmeticResult('add', 38, 19, 38, 18, { maxPrecision: 38 });
            expect(result.scale).toBe(19); // max(19, 18) = 19
            expect(result.precision).toBe(38); // Adjusted to max
        });

        test('very small operands', () => {
            const result = calculateRdbmsArithmeticResult('multiply', 1, 0, 1, 0);
            expect(result.scale).toBe(0);
            expect(result.precision).toBe(3); // 1 + 1 + 1 = 3
        });

        test('asymmetric operands', () => {
            const result = calculateRdbmsArithmeticResult('add', 100, 2, 5, 4);
            expect(result.scale).toBe(4); // max(2, 4) = 4
            expect(result.precision).toBe(38); // Adjusted to maxPrecision limit
        });

        test('zero integer digits', () => {
            const result = calculateRdbmsArithmeticResult('add', 5, 5, 3, 3);
            expect(result.scale).toBe(5); // max(5, 3) = 5
            expect(result.precision).toBe(6); // max(0, 0) + 5 + 1 = 6
        });
    });
});