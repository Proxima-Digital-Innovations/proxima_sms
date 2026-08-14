const fs = require('fs');
const files = [
  'src/app/dashboard/behavioural/enter/page.tsx', 
  'src/app/dashboard/exam-questions/page.tsx', 
  'src/app/dashboard/finance/expenses/page.tsx', 
  'src/app/dashboard/finance/fee-structures/page.tsx', 
  'src/app/dashboard/finance/invoices/page.tsx'
]; 
files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let text = fs.readFileSync(f, 'utf8'); 
  text = text.replace(/const itemVariants: Variants = /g, 'const itemVariants: any = ');
  text = text.replace(/const itemVariants = \{/g, 'const itemVariants: any = {');
  text = text.replace(/type: 'spring'/g, 'type: \\'spring\\' as const');
  text = text.replace(/type: "spring"/g, 'type: \\'spring\\' as const');
  text = text.replace(/<motion.Fragment/g, '<React.Fragment');
  text = text.replace(/<\/motion.Fragment>/g, '</React.Fragment>');
  text = text.replace(/let studentsData;/g, 'let studentsData: any[] = [];'); 
  text = text.replace(/import \{ motion, AnimatePresence \}/g, 'import { motion, AnimatePresence } from \\'framer-motion\\';\nimport React from \\'react\\';\n');
  fs.writeFileSync(f, text); 
});
