import OpenAI from 'openai';
import { SubscriptionService } from './subscriptionService';

export type ChatAction =
  | {
      type: 'SUBSCRIPTION_NEW';
      payload: {
        name: string;
        description?: string;
        cost: number;
        frequency: 'weekly' | 'monthly' | 'yearly';
        recipient_address: string;
        auto_pay: boolean;
      };
    }
  | { type: 'SUBSCRIPTION_EXISTING'; payload: { service_id: string } }
  | { type: 'PAY'; payload: { subscription_id: string } }
  | {
      type: 'CATALOG_ONLY';
      payload: {
        name: string;
        description?: string;
        cost: number;
        frequency: 'weekly' | 'monthly' | 'yearly';
        recipient_address: string;
      };
    };

const SYSTEM_PROMPT = `You are Ankara Assistant for a Polkadot Hub dapp (native PAS subscriptions).

Rules:
- Never ask for private keys or seed phrases.
- Use tools to fetch the live service catalog and user subscriptions when the user asks or when you need ids.
- "Create a service" in this app usually means creating a subscription (on-chain + database). Use prepare_subscription_new unless they explicitly say they only want to list on the catalog without subscribing (then prepare_catalog_service).
- For subscribing to an existing listing, call prepare_subscribe_catalog with the service id from get_service_catalog.
- For paying, call prepare_pay_subscription with the backend subscription id (cuid from get_user_subscriptions).
- If the user has not given a required field (name, cost, frequency, recipient address), ask briefly — do not guess addresses.
- Frequencies must be exactly: weekly, monthly, or yearly.
- Recipient must be a 0x + 40 hex character address.

When the connected wallet is provided in context, use that address for get_user_subscriptions when they say "my" subscriptions.`;

const ETH_ADDR = /^0x[a-fA-F0-9]{40}$/;

function validAddress(addr: unknown): addr is string {
  return typeof addr === 'string' && ETH_ADDR.test(addr.trim());
}

function normFrequency(f: unknown): 'weekly' | 'monthly' | 'yearly' | null {
  const s = String(f ?? '').toLowerCase().trim();
  if (s === 'weekly' || s === 'monthly' || s === 'yearly') return s;
  return null;
}

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_service_catalog',
      description:
        'Return all active marketplace services: id, name, cost, frequency, recipientAddress.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_subscriptions',
      description:
        'List active subscriptions for a wallet. Each item includes id (backend cuid), service name, cost, onChainSubscriptionId if any.',
      parameters: {
        type: 'object',
        properties: {
          user_address: { type: 'string', description: '0x-prefixed 20-byte address' },
        },
        required: ['user_address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_subscription_new',
      description:
        'Draft a NEW subscription: creates service row + user subscribes on-chain in the app when user confirms.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          cost: { type: 'number', description: 'Amount in PAS per cycle' },
          frequency: { type: 'string', enum: ['weekly', 'monthly', 'yearly'] },
          recipient_address: { type: 'string' },
          auto_pay: { type: 'boolean', default: true },
        },
        required: ['name', 'cost', 'frequency', 'recipient_address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_subscribe_catalog',
      description:
        'Draft subscribing to an existing catalog service (user already picked service id from catalog).',
      parameters: {
        type: 'object',
        properties: {
          service_id: { type: 'string', description: 'Service id (cuid) from catalog' },
        },
        required: ['service_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_pay_subscription',
      description:
        'Draft a payment for an existing subscription. Use backend subscription id from get_user_subscriptions.',
      parameters: {
        type: 'object',
        properties: {
          subscription_id: { type: 'string', description: 'Backend subscription cuid' },
        },
        required: ['subscription_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_catalog_service',
      description:
        'Only add a service to the public catalog (API). User does not subscribe on-chain from this action.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          cost: { type: 'number' },
          frequency: { type: 'string', enum: ['weekly', 'monthly', 'yearly'] },
          recipient_address: { type: 'string' },
        },
        required: ['name', 'cost', 'frequency', 'recipient_address'],
      },
    },
  },
];

export async function runAnkaraChat(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: { userAddress?: string; contractAddress?: string };
}): Promise<{ reply: string; actions: ChatAction[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY is not configured on the server');
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
  const subscriptionService = new SubscriptionService();
  const collectedActions: ChatAction[] = [];

  const ctxLines: string[] = [];
  if (params.context?.userAddress) {
    ctxLines.push(`Connected wallet: ${params.context.userAddress}`);
  }
  if (params.context?.contractAddress) {
    ctxLines.push(`Subscription contract filter: ${params.context.contractAddress}`);
  }
  const ctxBlock = ctxLines.length ? `\n\nContext:\n${ctxLines.join('\n')}` : '';

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT + ctxBlock },
    ...params.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const maxRounds = 10;
  let lastAssistantText = '';

  for (let round = 0; round < maxRounds; round++) {
    const completion = await openai.chat.completions.create({
      model,
      messages: openaiMessages,
      tools,
      tool_choice: 'auto',
      temperature: 0.4,
    });

    const choice = completion.choices[0];
    if (!choice?.message) {
      throw new Error('Empty completion from model');
    }

    const msg = choice.message;
    openaiMessages.push(msg);

    if (msg.content) {
      lastAssistantText = msg.content;
    }

    const toolCalls = msg.tool_calls;
    if (!toolCalls?.length) {
      break;
    }

    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue;
      const name = tc.function.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;
      } catch {
        openaiMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ error: 'Invalid JSON arguments' }),
        });
        continue;
      }

      let result: unknown;

      try {
        if (name === 'get_service_catalog') {
          const list = await subscriptionService.getAllServices();
          result = list.map((s: { id: string; name: string; cost: number; frequency: string; recipientAddress: string }) => ({
            id: s.id,
            name: s.name,
            cost: s.cost,
            frequency: s.frequency,
            recipientAddress: s.recipientAddress,
          }));
        } else if (name === 'get_user_subscriptions') {
          const addr = args.user_address as string;
          if (!validAddress(addr)) {
            result = { error: 'Invalid user_address' };
          } else {
            const subs = await subscriptionService.getUserSubscriptions(
              addr.trim(),
              params.context?.contractAddress
            );
            result = subs.map((s: any) => ({
              id: s.id,
              serviceName: s.service?.name ?? s.serviceId,
              cost: s.cost,
              frequency: s.frequency,
              recipientAddress: s.recipientAddress,
              onChainSubscriptionId: s.onChainSubscriptionId ?? null,
              nextPaymentDate: s.nextPaymentDate,
            }));
          }
        } else if (name === 'prepare_subscription_new') {
          const frequency = normFrequency(args.frequency);
          const cost = Number(args.cost);
          const recipient = String(args.recipient_address ?? '').trim();
          const subName = String(args.name ?? '').trim();
          if (!subName || !frequency || !validAddress(recipient) || !Number.isFinite(cost) || cost <= 0) {
            result = { error: 'Invalid name, cost, frequency, or recipient_address' };
          } else {
            collectedActions.push({
              type: 'SUBSCRIPTION_NEW',
              payload: {
                name: subName,
                description: args.description ? String(args.description) : undefined,
                cost,
                frequency,
                recipient_address: recipient,
                auto_pay: args.auto_pay !== false,
              },
            });
            result = {
              ok: true,
              message: 'Draft saved. User can confirm in the app chat panel.',
            };
          }
        } else if (name === 'prepare_subscribe_catalog') {
          const sid = String(args.service_id ?? '').trim();
          if (!sid) {
            result = { error: 'service_id required' };
          } else {
            collectedActions.push({ type: 'SUBSCRIPTION_EXISTING', payload: { service_id: sid } });
            result = { ok: true, message: 'Draft saved for catalog subscribe.' };
          }
        } else if (name === 'prepare_pay_subscription') {
          const sid = String(args.subscription_id ?? '').trim();
          if (!sid) {
            result = { error: 'subscription_id required' };
          } else {
            collectedActions.push({ type: 'PAY', payload: { subscription_id: sid } });
            result = { ok: true, message: 'Draft saved for payment. User confirms in app (wallet tx).' };
          }
        } else if (name === 'prepare_catalog_service') {
          const frequency = normFrequency(args.frequency);
          const cost = Number(args.cost);
          const recipient = String(args.recipient_address ?? '').trim();
          const svcName = String(args.name ?? '').trim();
          if (!svcName || !frequency || !validAddress(recipient) || !Number.isFinite(cost) || cost <= 0) {
            result = { error: 'Invalid fields' };
          } else {
            collectedActions.push({
              type: 'CATALOG_ONLY',
              payload: {
                name: svcName,
                description: args.description ? String(args.description) : undefined,
                cost,
                frequency,
                recipient_address: recipient,
              },
            });
            result = { ok: true, message: 'Draft saved for catalog-only listing.' };
          }
        } else {
          result = { error: `Unknown tool ${name}` };
        }
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        result = { error: errMsg };
      }

      openaiMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      });
    }
  }

  return { reply: lastAssistantText || 'Done.', actions: collectedActions };
}
