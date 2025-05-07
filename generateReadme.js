// Import the necessary modules
import { promises as fs } from "fs";
import path from "path";

// Define the path for the markdown file you want to read
const HomePath = path.join(process.cwd(), "./src/docs", "home.md");
const AboutPath = path.join(process.cwd(), "./src/docs", "about.md");

// Define the path for the markdown file you want to generate
const outputMarkdownPath = path.join(process.cwd(), ".", "README.md");

// Function to read an existing markdown file and generate a new one
async function generateMarkdown() {
    try {
        // Read content from the existing markdown file
        const HomeContent = await fs.readFile(HomePath, "utf8");
        const AboutContent = await fs.readFile(AboutPath, "utf8");

        // Combine the existing content with the new content
        const combinedContent = [HomeContent, AboutContent].join("\n\n");

        // Write the combined content to a new markdown file
        await fs.writeFile(outputMarkdownPath, combinedContent);

        console.log("Markdown file generated successfully!");
    } catch (err) {
        console.error("Failed to generate markdown file:", err);
    }
}

// Call the function to generate the markdown
generateMarkdown();
