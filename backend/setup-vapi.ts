import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching agent from database...');
  const agent = await prisma.agent.findFirst({
    include: { workspace: true }
  });

  if (!agent) {
    console.error('No agent found in database. Please create an agent first.');
    process.exit(1);
  }

  const workspaceId = agent.workspaceId;
  const agentId = agent.id;
  const workspaceName = agent.workspace?.name || 'Test Workspace';

  console.log(`Found agent: ${agent.name} (${agentId}) in workspace ${workspaceId}`);

  const serverUrl = process.env.VAPI_SERVER_URL;
  const vapiApiKey = process.env.VAPI_API_KEY;
  if (!serverUrl || !vapiApiKey) {
    console.error('Missing VAPI_SERVER_URL or VAPI_API_KEY in environment.');
    process.exit(1);
  }
  const crypto = require('crypto');
  const serverUrlSecret = `vapi_secret_${workspaceId}_${crypto.randomBytes(16).toString('hex')}`;

  console.log('Provisioning Vapi assistant...');
  
  const systemPrompt = `You are ${agent.name}, a ${agent.persona || 'Friendly'} assistant for ${workspaceName}. Goal: ${agent.goal || 'Qualify leads'}. Be extremely concise. Use the query_knowledge_base tool for specific company questions.`;

  const response = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vapiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `${agent.name}${process.env.VAPI_AGENT_NAME_SUFFIX ?? ' (Kaligan Test)'}`,
      model: {
        provider: process.env.VAPI_DEFAULT_MODEL_PROVIDER || 'openai',
        model: process.env.VAPI_DEFAULT_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }],
        tools: [
          {
            type: 'function',
            messages: [{
              type: 'request-start',
              content: 'Let me check our knowledge base for that.'
            }],
            function: {
              name: 'query_knowledge_base',
              description: "Query the company's knowledge base for policies, terms of service, shipping information, FAQs, and general customer guidelines.",
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: "The customer's question or search query"
                  }
                },
                required: ['query']
              }
            }
          }
        ]
      },
      voice: {
        provider: 'openai',
        voiceId: 'alloy',
      },
      serverUrl: serverUrl,
      serverUrlSecret: serverUrlSecret,
      metadata: {
        workspaceId,
        agentId,
      },
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Error from Vapi: ${errText}`);
    process.exit(1);
  }

  const result: any = await response.json();
  console.log('\n--- SUCCESS ---');
  console.log(`Assistant ID: ${result.id}`);
  console.log(`Server URL Secret: ${serverUrlSecret}`);
  console.log('----------------\n');
  console.log('Next step: Go to the Vapi dashboard, add your Twilio number, and assign it to this Assistant ID!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
