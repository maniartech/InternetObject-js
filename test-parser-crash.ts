
import parse from './src/parser/index';

try {
  const doc = parse('~ null');
  console.log('Parsed ~ null:', JSON.stringify(doc.toObject(), null, 2));
} catch (e) {
  console.error('Error parsing ~ null:', e);
}

try {
  const doc = parse('~');
  console.log('Parsed ~:', JSON.stringify(doc.toObject(), null, 2));
} catch (e) {
  console.error('Error parsing ~:', e);
}
