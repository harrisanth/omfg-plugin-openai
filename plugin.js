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

export const agentMessage = async (...args) => {
  console.log({ args });
  return 'I am a bot based on omfg-plugin-openai.  \n\nI currently do nothing interesting. (YET!)';
};
