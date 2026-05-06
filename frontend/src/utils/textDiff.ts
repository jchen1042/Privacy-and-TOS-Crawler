import * as Diff from 'diff';

export interface DiffPart {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

// Pre-processes massive legal paragraphs into sentence-by-sentence lines 
const formatForDiff = (text: string): string => {
  if (!text) return '';
  
  // Normalize line endings 
  let formatted = text.replace(/\r\n/g, '\n');
  
  // Inject a newline after a period, question mark, or exclamation point 
  formatted = formatted.replace(/([.?!])\s+(?=[A-Z0-9])/g, '$1\n');
  
  return formatted;
};

// Generates a line-by-line diff between two texts using the optimized Myers' algorithm
export const generateLineDiff = (text1: string, text2: string): DiffLine[] => {
  // Pre-process the texts to break walls of text into sentences
  const formatted1 = formatForDiff(text1);
  const formatted2 = formatForDiff(text2);

  const changes = Diff.diffLines(formatted1, formatted2);
  const result: DiffLine[] = [];

  changes.forEach(change => {
    const type = change.added ? 'added' : change.removed ? 'removed' : 'unchanged';
    
    const lines = change.value.replace(/\n$/, '').split('\n');
    lines.forEach(line => {
      result.push({ type, value: line });
    });
  });

  return result;
};

//Generates a word-by-word diff for highlighting within a modified line.

export const generateCharacterDiff = (text1: string, text2: string): { left: DiffPart[], right: DiffPart[] } => {
  const changes = Diff.diffWordsWithSpace(text1 || '', text2 || '');
  const left: DiffPart[] = [];
  const right: DiffPart[] = [];

  changes.forEach(change => {
    if (change.added) {
      right.push({ type: 'added', value: change.value });
      left.push({ type: 'unchanged', value: '' }); 
    } else if (change.removed) {
      left.push({ type: 'removed', value: change.value });
      right.push({ type: 'unchanged', value: '' }); 
    } else {
      left.push({ type: 'unchanged', value: change.value });
      right.push({ type: 'unchanged', value: change.value });
    }
  });

  return { left, right };
};