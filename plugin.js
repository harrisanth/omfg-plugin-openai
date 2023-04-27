
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

// original: https://vercel.com/templates/next.js/ai-gpt3-chatbot
// here: a reasonably modified copy
async function OpenAIStream(payload, apiKey) {
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


/*
eventsource-parser v1.0.0

MIT License

Copyright (c) 2023 Espen Hovlandsdal <espen@hovlandsdal.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

function createParser(onParse) {
  let isFirstChunk;
  let buffer;
  let startingPosition;
  let startingFieldLength;
  let eventId;
  let eventName;
  let data;
  reset();
  return {
    feed,
    reset
  };
  function reset() {
    isFirstChunk = true;
    buffer = "";
    startingPosition = 0;
    startingFieldLength = -1;
    eventId = void 0;
    eventName = void 0;
    data = "";
  }
  function feed(chunk) {
    buffer = buffer ? buffer + chunk : chunk;
    if (isFirstChunk && hasBom(buffer)) {
      buffer = buffer.slice(BOM.length);
    }
    isFirstChunk = false;
    const length = buffer.length;
    let position = 0;
    let discardTrailingNewline = false;
    while (position < length) {
      if (discardTrailingNewline) {
        if (buffer[position] === "\n") {
          ++position;
        }
        discardTrailingNewline = false;
      }
      let lineLength = -1;
      let fieldLength = startingFieldLength;
      let character;
      for (let index = startingPosition; lineLength < 0 && index < length; ++index) {
        character = buffer[index];
        if (character === ":" && fieldLength < 0) {
          fieldLength = index - position;
        } else if (character === "\r") {
          discardTrailingNewline = true;
          lineLength = index - position;
        } else if (character === "\n") {
          lineLength = index - position;
        }
      }
      if (lineLength < 0) {
        startingPosition = length - position;
        startingFieldLength = fieldLength;
        break;
      } else {
        startingPosition = 0;
        startingFieldLength = -1;
      }
      parseEventStreamLine(buffer, position, fieldLength, lineLength);
      position += lineLength + 1;
    }
    if (position === length) {
      buffer = "";
    } else if (position > 0) {
      buffer = buffer.slice(position);
    }
  }
  function parseEventStreamLine(lineBuffer, index, fieldLength, lineLength) {
    if (lineLength === 0) {
      if (data.length > 0) {
        onParse({
          type: "event",
          id: eventId,
          event: eventName || void 0,
          data: data.slice(0, -1)
          // remove trailing newline
        });

        data = "";
        eventId = void 0;
      }
      eventName = void 0;
      return;
    }
    const noValue = fieldLength < 0;
    const field = lineBuffer.slice(index, index + (noValue ? lineLength : fieldLength));
    let step = 0;
    if (noValue) {
      step = lineLength;
    } else if (lineBuffer[index + fieldLength + 1] === " ") {
      step = fieldLength + 2;
    } else {
      step = fieldLength + 1;
    }
    const position = index + step;
    const valueLength = lineLength - step;
    const value = lineBuffer.slice(position, position + valueLength).toString();
    if (field === "data") {
      data += value ? "".concat(value, "\n") : "\n";
    } else if (field === "event") {
      eventName = value;
    } else if (field === "id" && !value.includes("\0")) {
      eventId = value;
    } else if (field === "retry") {
      const retry = parseInt(value, 10);
      if (!Number.isNaN(retry)) {
        onParse({
          type: "reconnect-interval",
          value: retry
        });
      }
    }
  }
}
const BOM = [239, 187, 191];
function hasBom(buffer) {
  return BOM.every((charCode, index) => buffer.charCodeAt(index) === charCode);
}
