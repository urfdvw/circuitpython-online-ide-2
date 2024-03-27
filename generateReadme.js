// Import the necessary modules
import { promises as fs } from 'fs';
import path from 'path';

// Define the path for the markdown file you want to read
const inputMarkdownPath = path.join(process.cwd(), './src/documents/wiki', 'About.md');

// Define the path for the markdown file you want to generate
const outputMarkdownPath = path.join(process.cwd(), '.', 'generatedMarkdown.md');

// Function to read an existing markdown file and generate a new one
async function generateMarkdown() {
  try {
    // Read content from the existing markdown file
    const existingContent = await fs.readFile(inputMarkdownPath, 'utf8');

    // Define additional content or modify as needed
    const additionalContent = `\n\n## Additional Section\n\nThis content was added programmatically.`;

    // Combine the existing content with the new content
    const combinedContent = existingContent + additionalContent;

    // Write the combined content to a new markdown file
    await fs.writeFile(outputMarkdownPath, combinedContent);

    console.log('Markdown file generated successfully!');
  } catch (err) {
    console.error('Failed to generate markdown file:', err);
  }
}

// Call the function to generate the markdown
generateMarkdown();
