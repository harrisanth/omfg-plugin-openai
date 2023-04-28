export const version = '0.0.3';

export const agentSettings = {
	model: {
		type: 'input',
		label: 'Model',
	},
	initial_prompt: {
		type: 'text_area',
		label: 'Initial Prompt',
		description: 'Enter intial instructions for the agent.',
	},
	initial_message: {
		type: 'text_area',
		label: 'Initial Message',
		description: 'Extra instructions included with every message.',
	},
};

const getAgent = ({
	initial_prompt = '',
	initial_message = '',
	model,
	temperature = 0.7,
	top_p = 1,
	frequency_penalty = 0,
	presence_penalty = 0,
	n = 1,
	stream = true,
} = {}) => ({
	model: model || 'gpt-3.5-turbo',
	temperature,
	top_p,
	frequency_penalty,
	presence_penalty,
	stream,
	n,
	max_tokens: process.env.AI_MAX_TOKENS
		? parseInt(process.env.AI_MAX_TOKENS)
		: 300,
	message: (m) => {
		if (!initial_message) return m;
		return {
			...m,
			content: initial_message.replace('{{content}}', m.content),
		};
	},
	start: ({ max_tokens }) => {
		if (!initial_prompt) return '';
		return initial_prompt
			.replace(/\$\{Date\.now\(\)\}/g, new Date().toISOString())
			.replace(/\\n/g, '\n')
			.replace(/\$\{max_tokens\}/g, max_tokens);
	},
});

export const agentMessage = async (args) => {
	const { settings, messages = [], user, apiKey } = args;
	console.log({ args });
	const agent = getAgent(settings);
	const payload = {
		...agent,
		messages: [
			{
				role: 'system',
				content: agent.start(agent),
			},
			...messages.slice(0, -1),
			agent.message(messages[messages.length - 1]),
		],
		user,
	};
	console.log(JSON.stringify({ agent, payload }, null, 2));
	const requestHeaders = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${apiKey}`,
	};
	const OpenAIResponse = await fetch(
		'https://api.openai.com/v1/chat/completions',
		{
			headers: requestHeaders,
			method: 'POST',
			body: JSON.stringify(payload),
		}
	);
	return OpenAIResponse;
};
