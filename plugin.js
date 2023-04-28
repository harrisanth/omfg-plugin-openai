export const version = '0.0.4';

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
	max_tokens: {
		type: 'input',
		label: 'Max Tokens',
		description: "The maximum number of tokens to generate."
	},
	temperature: {
		type: 'input',
		label: 'Temperature (0.0 -> 2.0)',
		description: "Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic."
	},
	top_p: {
		type: 'input',
		label: 'top_p (0.1 -> 1.0)',
		description: "An alternative to temperature, called nucleus sampling, where model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. Recommend altering this or temperature but not both."
	},
	presence_penalty: {
		type: 'input',
		label: 'Presence Penalty (-2.0 -> 2.0)',
		description: "Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics."
	},
	frequency_penalty: {
		type: 'input',
		label: 'Frequency Penalty (-2.0 -> 2.0)',
		description: "Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim."
	},
};

const getAgent = ({
	initial_prompt = '',
	initial_message = '',
	model,
	max_tokens = 300,
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
	max_tokens,
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
