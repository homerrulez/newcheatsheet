// Debug script to test box positioning
console.log('=== TESTING BOX LAYOUT CONSTRAINTS ===');

// Test the positioning logic from the code
const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;
const MARGIN = 72;
const BOX_WIDTH = 200;
const BOX_HEIGHT = 150;
const SPACING = 20;

// Calculate boxes per row
const usableWidth = PAGE_WIDTH - (2 * MARGIN);
const boxesPerRow = Math.floor(usableWidth / (BOX_WIDTH + SPACING));

console.log(`Page width: ${PAGE_WIDTH}px`);
console.log(`Usable width (with margins): ${usableWidth}px`);
console.log(`Box width + spacing: ${BOX_WIDTH + SPACING}px`);
console.log(`Calculated boxes per row: ${boxesPerRow}`);

console.log('\n=== TESTING 15 BOX POSITIONS ===');

for (let i = 0; i < 15; i++) {
  const row = Math.floor(i / boxesPerRow);
  const col = i % boxesPerRow;
  const page = Math.floor(row / Math.floor((PAGE_HEIGHT - 2 * MARGIN) / (BOX_HEIGHT + SPACING)));
  
  const x = MARGIN + col * (BOX_WIDTH + SPACING) + (page * (PAGE_WIDTH + 40));
  const y = MARGIN + (row % Math.floor((PAGE_HEIGHT - 2 * MARGIN) / (BOX_HEIGHT + SPACING))) * (BOX_HEIGHT + SPACING) + (page * 40);
  
  const withinBounds = x + BOX_WIDTH <= PAGE_WIDTH + (page * (PAGE_WIDTH + 40));
  
  console.log(`Box ${i + 1}: x=${x}, y=${y}, page=${page + 1}, row=${row}, col=${col}, withinBounds=${withinBounds}`);
  
  if (!withinBounds) {
    console.log(`❌ Box ${i + 1} EXCEEDS PAGE BOUNDARIES!`);
  }
}

console.log('\n=== BOUNDARY TEST ===');
console.log(`Page boundary: 0 to ${PAGE_WIDTH}px width`);
console.log(`Max allowed X for box: ${PAGE_WIDTH - BOX_WIDTH}px`);