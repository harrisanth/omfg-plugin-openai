export const version = '0.0.4';

export const agentSettings = {
	openAIApiKey: {
		type: 'input',
		label: 'OpenAI API Key',
	},
	serpApiKey: {
		type: 'input',
		label: 'SERP API Key',
	},
};

const LangChainStream =
	({ langchain, settings, messages = [], openAIApiKey: userOpenAIKey }) =>
	async (controller) => {
		const { openAIApiKey = userOpenAIKey, serpApiKey } = settings;
		const input = messages[messages.length - 1].content;
		const { OpenAI } = langchain.llms;
		const { SerpAPI, Calculator } = langchain.tools;
		const { initializeAgentExecutorWithOptions } = langchain.agents;

		const model = new OpenAI({
			openAIApiKey,
			streaming: true,
			callbacks: [
				{
					handleLLMNewToken(token) {
						const encoder = new TextEncoder();
						controller.enqueue(encoder.encode(token));
					},
				},
			],
		});
		const tools = [
			new SerpAPI(serpApiKey, {
				location: 'Roswell,Georgia,United States',
				hl: 'en',
				gl: 'us',
			}),
			new Calculator(),
		];
		//console.log({ langchain });
		const executor = await initializeAgentExecutorWithOptions(
			tools,
			model,
			{
				agentType: 'zero-shot-react-description',
				returnIntermediateSteps: false,
			}
		);
		await executor.call({ input });
		controller.close();
	};

export const agentMessage = (args) =>
	new ReadableStream({
		start: LangChainStream(args),
	});
