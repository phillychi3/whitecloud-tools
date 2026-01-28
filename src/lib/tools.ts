export type Tool = {
	name: string
	url: string
	description: string
	status?: ToolStatus
}

export const gettoolsByCategory = (category: string): Tool[] => {
	return TOOLS[category] || []
}

export type ToolStatus = 'online' | 'maintenance' | 'development'
export const TOOLS: Record<string, Tool[]> = {
	FF14: [
		{
			name: 'Mini Cactpot Solver',
			url: '/ff14/mini-cactpot',
			description: 'Solve your daily Mini Cactpot ticket with ease!',
			status: 'maintenance'
		}
	],
	devtools: [
		{
			name: 'serialization Tool',
			url: '/devtools/serialization-tool',
			description: 'A tool for serializing and deserializing data like JSON, XML, and YAML.',
			status: 'development'
		},
		{
			name: 'UUID Generator',
			url: '/devtools/uuid-generator',
			description: 'Generate unique identifiers (UUIDs).',
			status: 'online'
		},
		{
			name: 'text converter',
			url: '/devtools/text-converter',
			description: 'Convert text between different formats and encodings.',
			status: 'online'
		},
		{
			name: 'IP Subnet Calculator',
			url: '/devtools/ip-subnet-calculator',
			description: 'Calculate and analyze IP subnets.',
			status: 'development'
		}
	],
	security: [
		{
			name: 'caesar',
			url: '/security/caesar',
			description: 'Encrypt and decrypt text using the Caesar cipher.',
			status: 'development'
		},
		{
			name: 'vigenere',
			url: '/security/vigenere',
			description: 'Encrypt and decrypt text using the Vigenère cipher.',
			status: 'development'
		},
		{
			name: 'hash',
			url: '/security/hash',
			description: 'Generate cryptographic hashes like MD5, SHA-1, and SHA-256.',
			status: 'development'
		},
		{
			name: 'jwt tool',
			url: '/security/jwt-tool',
			description: 'Create, decode, modify, and verify JSON Web Tokens (JWT).',
			status: 'development'
		},
		{
			name: 'morse code',
			url: '/security/morse-code',
			description: 'Encode and decode messages using Morse code.',
			status: 'development'
		}
	],
	text: [
		{
			name: 'text diff',
			url: '/text/text-diff',
			description: 'Compare and highlight differences between text files.',
			status: 'development'
		},
		{
			name: 'word counter',
			url: '/text/word-counter',
			description: 'Count words, characters, and lines in your text.',
			status: 'online'
		}
	],
	image: [
		{
			name: 'AI Image Replace',
			url: '/image/ai-replace',
			description: 'Replace parts of an image using AI based on a mask and reference image.',
			status: 'online'
		}
	]
}
