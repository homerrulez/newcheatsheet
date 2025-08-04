// Debug actual box positioning and state
console.log('=== DEBUGGING ACTUAL BOX POSITIONING ===');

// Simulate what happens when "50 physics equations" is requested
const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;
const MARGIN = 72;
const BOX_WIDTH = 200;
const BOX_HEIGHT = 150;
const SPACING = 20;

// Calculate boxes per row (from current code)
const usableWidth = PAGE_WIDTH - (2 * MARGIN);
const boxesPerRow = Math.floor(usableWidth / (BOX_WIDTH + SPACING));

console.log('=== LAYOUT CALCULATIONS ===');
console.log(`Page Width: ${PAGE_WIDTH}px`);
console.log(`Margins: ${MARGIN}px each side`);
console.log(`Usable Width: ${usableWidth}px`);
console.log(`Box Width + Spacing: ${BOX_WIDTH + SPACING}px`);
console.log(`Calculated Boxes Per Row: ${boxesPerRow}`);
console.log('');

console.log('=== FIRST 10 BOX POSITIONS (ACTUAL ALGORITHM) ===');
for (let i = 0; i < 10; i++) {
  const row = Math.floor(i / boxesPerRow);
  const col = i % boxesPerRow;
  const page = Math.floor(row / Math.floor((PAGE_HEIGHT - 2 * MARGIN) / (BOX_HEIGHT + SPACING)));
  
  const x = MARGIN + col * (BOX_WIDTH + SPACING) + (page * (PAGE_WIDTH + 40));
  const y = MARGIN + (row % Math.floor((PAGE_HEIGHT - 2 * MARGIN) / (BOX_HEIGHT + SPACING))) * (BOX_HEIGHT + SPACING) + (page * 40);
  
  console.log(`Box ${i + 1}:`);
  console.log(`  Row: ${row}, Col: ${col}, Page: ${page + 1}`);
  console.log(`  Position: (${x}, ${y})`);
  console.log(`  Within single page? ${x <= PAGE_WIDTH}`);
  console.log(`  Box right edge: ${x + BOX_WIDTH}px`);
  console.log('');
}

console.log('=== PROBLEM ANALYSIS ===');
const rows_per_page = Math.floor((PAGE_HEIGHT - 2 * MARGIN) / (BOX_HEIGHT + SPACING));
console.log(`Rows per page: ${rows_per_page}`);
console.log(`Boxes per page: ${boxesPerRow * rows_per_page}`);

// Check when boxes start going to page 2
const first_page2_box = boxesPerRow * rows_per_page;
console.log(`First box on page 2: Box ${first_page2_box + 1}`);

if (first_page2_box < 50) {
  console.log(`❌ ISSUE: 50 boxes will span ${Math.ceil(50 / (boxesPerRow * rows_per_page))} pages`);
} else {
  console.log(`✅ All 50 boxes fit on one page`);
}