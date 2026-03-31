import {
  samplesToHistogram,
  bitstringToName,
  deriveTokenName,
  generateSimulatedSamples,
} from '../src/quantum/result-parser';

console.log('=== Result Parser Tests ===\n');

// Test 1: bitstringToName
console.log('--- Test 1: bitstringToName ---');
const testCases: [string, string | null][] = [
  ['00000000000000000000', 'AAAA'],  // All zeros = A,A,A,A
  ['00001000010001000100', 'ABCDE'], // A=00000, B=00001, C=00010, D=00011, E=00100
  ['10011101001001111001', null],     // Check specific mapping
];

// A=0=00000, B=1=00001, ... Z=25=11001
// Let's test known mappings
const tBits = (19).toString(2).padStart(5, '0'); // T=19
const oBits = (14).toString(2).padStart(5, '0'); // O=14
const rBits = (17).toString(2).padStart(5, '0'); // R=17
const eBits = (4).toString(2).padStart(5, '0');  // E=4

const toreBits = tBits + oBits + rBits + eBits;
console.log(`TORE bits: ${tBits}|${oBits}|${rBits}|${eBits} = ${toreBits}`);
const toreResult = bitstringToName(toreBits);
console.log(`bitstringToName("${toreBits}") = "${toreResult}"`);
if (toreResult !== 'TORE') throw new Error(`Expected TORE, got ${toreResult}`);

// Test invalid (group value > 25)
const invalidBits = '11110' + '00000' + '00000' + '00000'; // 30,0,0,0
const invalidResult = bitstringToName(invalidBits);
console.log(`bitstringToName with value 30: ${invalidResult}`);
if (invalidResult !== null) throw new Error('Should be null for value > 25');

console.log('✓ bitstringToName works\n');

// Test 2: samplesToHistogram
console.log('--- Test 2: samplesToHistogram ---');
const testSamples = ['0x0', '0x0', '0x1', '0x0', '0x2'];
const hist = samplesToHistogram(testSamples, 20);
console.log(`Histogram entries: ${hist.size}`);
console.log(`0x0 count: ${hist.get('00000000000000000000')}`);
if (hist.get('00000000000000000000') !== 3) throw new Error('Expected 3 for 0x0');
console.log('✓ samplesToHistogram works\n');

// Test 3: Full name derivation with simulated data
console.log('--- Test 3: Simulated name derivation ---');
const simSamples = generateSimulatedSamples(8192);
console.log(`Generated ${simSamples.length} simulated samples`);
console.log(`Sample hex values: ${simSamples.slice(0, 5).join(', ')}`);

const tokenName = deriveTokenName(simSamples, 20);
console.log(`\nDerived token name: ${tokenName.name}`);
console.log(`Symbol: ${tokenName.symbol}`);
console.log(`Probability: ${(tokenName.probability * 100).toFixed(2)}%`);
console.log(`Count: ${tokenName.count}/${tokenName.totalShots}`);

if (tokenName.name.length !== 4) throw new Error('Name should be 4 characters');
if (!/^[A-Z]{4}$/.test(tokenName.name)) throw new Error('Name should be 4 uppercase letters');
console.log('✓ Name derivation works\n');

// Test 4: Run multiple trials to see name variety
console.log('--- Test 4: Multiple derivation trials ---');
const names = new Set<string>();
for (let i = 0; i < 10; i++) {
  const samples = generateSimulatedSamples(8192);
  const result = deriveTokenName(samples, 20);
  names.add(result.name);
}
console.log(`\nUnique names from 10 trials: ${names.size}`);
console.log(`Names: ${Array.from(names).join(', ')}`);

console.log('\n=== ALL PARSER TESTS PASSED ===');
