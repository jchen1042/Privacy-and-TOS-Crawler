import React, { useState, useEffect } from 'react';
import { DocumentVersion } from '@/types/history';
import { generateLineDiff, generateCharacterDiff, DiffLine, DiffPart } from '@/utils/textDiff';
import { Card, CardContent, CardHeader, CardTitle} from '@/components/ui'; 

interface DocumentDiffViewerProps {
  version1: DocumentVersion | null;
  version2: DocumentVersion | null;
}

const DocumentDiffViewer: React.FC<DocumentDiffViewerProps> = ({ version1, version2 }) => {
  // Define a new interface for the paired diff lines for side-by-side display
  interface PairedDiffLine {
    type: 'added' | 'removed' | 'unchanged' | 'modified';
    leftLineNum: number | null;
    rightLineNum: number | null;
    leftContent?: string;
    rightContent?: string;
    leftCharDiffs?: DiffPart[];
    rightCharDiffs?: DiffPart[];
  }

  const [pairedDiffLines, setPairedDiffLines] = useState<PairedDiffLine[]>([]);

  useEffect(() => {
    if (version1?.raw_text && version2?.raw_text) {
      const linearDiff = generateLineDiff(version1.raw_text, version2.raw_text);
      
      const newPairedDiff: PairedDiffLine[] = [];
      let leftLineCounter = 0;
      let rightLineCounter = 0;
      let i = 0;

      while (i < linearDiff.length) {
        const current = linearDiff[i];

        if (current.type === 'unchanged') {
          leftLineCounter++;
          rightLineCounter++;
          newPairedDiff.push({
            type: 'unchanged',
            leftContent: current.value,
            rightContent: current.value,
            leftLineNum: leftLineCounter,
            rightLineNum: rightLineCounter
          });
          i++;
        } else if (current.type === 'removed') {
          // Look ahead: if a removed line is followed by an added line, pair them as "modified"
          if (i + 1 < linearDiff.length && linearDiff[i + 1].type === 'added') {
            const removedText = current.value;
            const addedText = linearDiff[i + 1].value;

            // SAFETY FAILSAFE: If the paragraph is massive, calculating inline diffs blocks the main thread.
            // Treat them as separate removed/added blocks instead of a single modified block.
            if (removedText.length + addedText.length > 2500) {
              leftLineCounter++;
              newPairedDiff.push({
                type: 'removed',
                leftContent: removedText,
                rightContent: '',
                leftLineNum: leftLineCounter,
                rightLineNum: null
              });
              i++; // Only increment by 1 so the loop processes the 'added' line on the next pass
            } else {
              // Safe to compute inline highlight differences
              leftLineCounter++;
              rightLineCounter++;
              const charDiff = generateCharacterDiff(removedText, addedText);
              newPairedDiff.push({
                type: 'modified',
                leftCharDiffs: charDiff.left,
                rightCharDiffs: charDiff.right,
                leftLineNum: leftLineCounter,
                rightLineNum: rightLineCounter
              });
              i += 2;
            }
          } else {
            // Standard removed line (no added line following it)
            leftLineCounter++;
            newPairedDiff.push({
              type: 'removed',
              leftContent: current.value,
              rightContent: '',
              leftLineNum: leftLineCounter,
              rightLineNum: null
            });
            i++;
          }
        } else if (current.type === 'added') {
          rightLineCounter++;
          newPairedDiff.push({
            type: 'added',
            leftContent: '',
            rightContent: current.value,
            leftLineNum: null,
            rightLineNum: rightLineCounter
          });
          i++;
        }
      }
      setPairedDiffLines(newPairedDiff);
    } else {
      setPairedDiffLines([]);
    }
  }, [version1, version2]);

  // Determine if there are any actual differences beyond just whitespace or empty lines
  const hasMeaningfulDiff = pairedDiffLines.some(line => {
    if (line.type !== 'unchanged') return true;
    if (line.leftContent && line.rightContent) {
      return line.leftContent.trim() !== line.rightContent.trim();
    }
    return false;
  });

  if (!version1 || !version2) {
    return (
      <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
        <CardContent className="p-6 text-gray-400">
          Please select two document versions to compare.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
      <CardHeader className="border-b border-gray-700">
        <CardTitle className="text-white">
          Document Diff: v{version1.version_number ?? '?'} vs v{version2.version_number ?? '?'}
        </CardTitle>
        <p className="text-sm text-gray-400">
          Comparing versions from {new Date(version1.created_at).toLocaleDateString()} and {new Date(version2.created_at).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="font-mono text-xs overflow-auto max-h-[700px] bg-gray-950/50 rounded-b-[2.5rem]">
          {pairedDiffLines.length > 0 && hasMeaningfulDiff ? (
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '5%' }} /> {/* Left line number */}
                <col style={{ width: '45%' }} /> {/* Left content */}
                <col style={{ width: '5%' }} /> {/* Right line number */}
                <col style={{ width: '45%' }} /> {/* Right content */}
              </colgroup>
              <tbody>
                {pairedDiffLines.map((line, index) => {
                  const rowBg = line.type === 'added' ? 'bg-green-900/20' : 
                                line.type === 'removed' ? 'bg-red-900/20' : 
                                line.type === 'modified' ? 'bg-blue-900/5' : 'bg-gray-900/10';
                  
                  return (
                    <tr key={index} className={`${rowBg} border-b border-gray-800/30 last:border-0`}>
                      {/* Left side */}
                      <td className="text-right pr-2 text-gray-600 select-none border-r border-gray-800/50 py-1 align-top text-[10px]">
                        {line.leftLineNum}
                      </td>
                      <td className={`px-3 py-1 leading-tight break-words whitespace-pre-wrap text-gray-300 align-top ${
                        line.type === 'removed' ? 'text-red-400 line-through' : ''
                      }`}>
                        {line.type === 'modified' && line.leftCharDiffs 
                          ? renderDiffParts(line.leftCharDiffs) 
                          : (line.leftContent || ' ')}
                      </td>
                      {/* Right side */}
                      <td className="text-right pr-2 text-gray-600 select-none border-l border-gray-800/50 py-1 align-top text-[10px]">
                        {line.rightLineNum}
                      </td>
                      <td className={`px-3 py-1 leading-tight break-words whitespace-pre-wrap text-gray-300 align-top ${
                        line.type === 'added' ? 'text-green-400' : ''
                      }`}>
                        {line.type === 'modified' && line.rightCharDiffs 
                          ? renderDiffParts(line.rightCharDiffs) 
                          : (line.rightContent || ' ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-gray-500">No differences found between selected versions.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const renderDiffParts = (parts: DiffPart[]) => {
  return parts.map((part, idx) => (
    <span
      key={idx}
      className={`${
        part.type === 'added' ? 'bg-green-700/50 text-green-200' : 
        part.type === 'removed' ? 'bg-red-700/50 text-red-200 line-through' : ''
      }`}
    >
      {part.value}
    </span>
  ));
};

export default DocumentDiffViewer;
