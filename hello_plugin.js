export const version = '0.0.4';

export const agentSettings = {
	plugin_name: {
		type: 'input',
		label: 'Chat Bot Name',
	},
};

export const agentMessage = async (args) => {
	const { settings, messages = [], user, apiKey } = args;

	return new Response("hello world from " + settings.plugin_name);
};
