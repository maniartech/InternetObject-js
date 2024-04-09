
async function fetchAndDecode() {
  const response = await fetch('http://localhost:8080');
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder();
  const text = decoder.decode(buffer);

  const sections = text.split('--- ')
      .filter(section => section.trim() !== '')
      .map(section => {
          const [header, ...content] = section.split('\n');
          const [sectionName, byteInfo] = header.split(' (');
          const byteCount = byteInfo ? parseInt(byteInfo.split(' ')[0], 10) : undefined;
          return {
              sectionName: sectionName.trim(),
              byteCount,
              content: content.join('\n').trim()
          };
      });

  console.log('Decoded Sections:', sections);
}

fetchAndDecode();
