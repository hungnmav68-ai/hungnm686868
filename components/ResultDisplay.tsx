
import React, { useEffect, useState, useCallback } from 'react';
import { EditableTable } from './EditableTable';
import type { ExtractionOption } from '../types';

declare global {
  interface Window {
    marked: {
      parse(markdown: string): string;
    }; 
    DOMPurify: {
      sanitize(html: string): string;
    };
  }
}

interface ResultDisplayProps {
  markdownContent: string;
  hasTable: boolean;
  fileName: string;
  currentExtractionOption: ExtractionOption;
}

interface DocumentPart {
  id: string;
  type: 'markdown' | 'table';
  content: string;
}

const parseMarkdown = (markdown: string): DocumentPart[] => {
    const tableRegex = /(\|.*\|(?:\r?\n|\r)?\|(?:-+\|)+(\r?\n|\r)?(?:\|.*\|(?:\r?\n|\r)?)*)/g;
    const parts: DocumentPart[] = [];
    let lastIndex = 0;
    let match;

    while ((match = tableRegex.exec(markdown)) !== null) {
        if (match.index > lastIndex) {
            parts.push({
                id: `md-${lastIndex}`,
                type: 'markdown',
                content: markdown.substring(lastIndex, match.index),
            });
        }
        parts.push({
            id: `tbl-${match.index}`,
            type: 'table',
            content: match[0],
        });
        lastIndex = tableRegex.lastIndex;
    }

    if (lastIndex < markdown.length) {
        parts.push({
            id: `md-${lastIndex}`,
            type: 'markdown',
            content: markdown.substring(lastIndex),
        });
    }
    return parts;
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ markdownContent, currentExtractionOption }) => {
  const [documentParts, setDocumentParts] = useState<DocumentPart[]>([]);

  useEffect(() => {
    if (markdownContent) {
        setDocumentParts(parseMarkdown(markdownContent));
    } else {
        setDocumentParts([]);
    }
  }, [markdownContent]);

  const handleTableUpdate = useCallback((tableId: string, updatedMarkdown: string) => {
    setDocumentParts(currentParts =>
        currentParts.map(part =>
            part.id === tableId ? { ...part, content: updatedMarkdown } : part
        )
    );
  }, []);

  const renderPart = (part: DocumentPart) => {
    if (part.type === 'markdown') {
        const sanitizedHtml = window.DOMPurify.sanitize(window.marked.parse(part.content));
        return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
    }
    if (part.type === 'table') {
        const isTableEditable = !['condensed', 'summary-table'].includes(currentExtractionOption);
        return <EditableTable tableId={part.id} initialMarkdown={part.content} onUpdate={handleTableUpdate} isEditable={isTableEditable} />
    }
    return null;
  }

  return (
    <div className="h-full">
      <div className="prose prose-sm max-w-none h-full overflow-y-auto pr-4">
        {documentParts.map(part => <div key={part.id}>{renderPart(part)}</div>)}
      </div>
    </div>
  );
};
