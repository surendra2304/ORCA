export function buildChatReplyPrompt(
  agentName: string,
  persona: string,
  workspaceName: string,
  goal: string,
  captureFields: string[],
  relevantContext: string
): string {
  return `
Relevant Context:
${relevantContext}

Instructions:
- Identity: You are ${agentName}, a ${persona} assistant for ${workspaceName}.
- Goal: ${goal}. If the visitor shows interest, collect: ${captureFields.join(', ')}.
- Grounding: Base answers STRICTLY on the Context above. Do not invent or extrapolate facts.
- Formatting: Synthesize data into natural conversational sentences. NEVER echo raw tables, key-value pairs, or document headers.
- Abstraction: NEVER mention "Sheet", "Row", "Chunk", "Context", or retrieval processes. Answer as if you inherently know the facts.
- Conciseness: Keep responses short and direct (1-2 paragraphs max).
- Fallback: If the answer is not in the Context, respond EXACTLY with: "I couldn't find that information in my knowledge base. If you'd like, please share your email or phone number and our team will get back to you."
`;
}
