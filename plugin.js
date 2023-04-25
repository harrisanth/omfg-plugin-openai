import { foo } from './import_test.js';
console.log({ foo });

export const version = "0.0.2";

export const agentSettings = {
  model: {
    type: "input",
    label: "Model",
  },
  initial_prompt: {
    type: "text_area",
    label: "Initial Prompt",
    description: "Enter intial instructions for the agent."
  },
  initial_message: {
    type: "text_area",
    label: "Initial Message",
    description: "Extra instructions included with every message."
  },
};

export const agentMessage = async (args) => {
  const { settings, messages, user, apiKey } = args;
  const messageLength = messages.length;
  //console.log(JSON.stringify({ args }, null, 2));
  return `
    You have sent ${messages.length} message(s) in this conversation.
    Datetime: ${new Date().toISOString()}
  `.replace(/    /gm, '').trim();
};
