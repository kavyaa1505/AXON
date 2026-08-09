export interface ParsedEdit {
  path: string;
  newContent: string;
  status: "pending" | "accepted" | "rejected" | "reverted";
}

export interface ParseResult {
  cleanText: string;
  edits: ParsedEdit[];
}

export function parseAgentEdits(content: string): ParseResult {
  const edits: ParsedEdit[] = [];
  
  // Regex to match ```edit:filepath\ncontent\n```
  // It captures the filepath in group 1, and the content in group 2
  const editRegex = /```edit:(.+?)\n([\s\S]*?)```/g;
  
  // Extract edits
  let match;
  while ((match = editRegex.exec(content)) !== null) {
    edits.push({
      path: match[1].trim(),
      newContent: match[2],
    });
  }
  
  // Replace the edit blocks with a placeholder or just remove them to get clean text
  const cleanText = content.replace(editRegex, '').trim();
  
  return { cleanText, edits };
}
