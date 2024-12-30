import { readFileSync } from 'fs';

export const load = async () => {
	const readmeText = readFileSync('README.md', 'utf-8');
	return { readmeText };
};
