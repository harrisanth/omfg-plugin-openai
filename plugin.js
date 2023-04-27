import { createParser } from 'eventsource-parser';

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

export async function OpenAIStream(payload, apiKey) {
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	let counter = 0;

	const requestHeaders = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${apiKey}`,
	};
	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		headers: requestHeaders,
		method: 'POST',
		body: JSON.stringify(payload),
	});

	const onParse = (controller) => (event) => {
		const { data, type } = event;
		if (type !== 'event') {
			console.log(`Unknown Event: ${type}`);
			return;
		}

		// https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
		if (data === '[DONE]') {
			controller.close();
			return;
		}

		let parsedData;
		try {
			parsedData = JSON.parse(data);
		} catch (e) {
			controller.error('error parsing event data');
			return;
		}

		try {
			//console.log(json);
			const text = parsedData.choices[0].delta?.content || '';
			// this is a prefix character (i.e., "\n\n"), do nothing
			if (counter < 2 && (text.match(/\n/) || []).length) return;
			const truncated = parsedData.choices[0].finish_reason === 'length';
			const textToEncode = truncated ? '[CONTINUE]' : text;
			const queue = encoder.encode(textToEncode);
			controller.enqueue(queue);
			counter++;
		} catch (e) {
			controller.error(e);
		}
	};

	const stream = new ReadableStream({
		async start(controller) {
			const parser = createParser(onParse(controller));
			// https://web.dev/streams/#asynchronous-iteration
			for await (const chunk of res.body) {
				parser.feed(decoder.decode(chunk));
			}
		},
	});

	return stream;
}

const getAgent = async ({
	initial_prompt = '',
	initial_message = '',
	model = 'gpt-3.5-turbo',
	temperature = 0.7,
	top_p = 1,
	frequency_penalty = 0,
	presence_penalty = 0,
	n = 1,
}) => ({
	model,
	temperature,
	top_p,
	frequency_penalty,
	presence_penalty,
	n,
	max_tokens: process.env.AI_MAX_TOKENS
		? parseInt(process.env.AI_MAX_TOKENS)
		: 300,
	message: (m) => {
		if (!initial_message) return m;
		return {
			...m,
			content: initial.replace('{{content}}', m.content),
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
		top_p: 1,
		stream: true,
		user,
	};
	return await OpenAIStream(payload, apiKey);
};
