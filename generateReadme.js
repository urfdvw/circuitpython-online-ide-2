// Import the necessary modules
import { promises as fs } from "fs";
import path from "path";

// Define the path for the markdown file you want to read
const IntroPath = path.join(process.cwd(), "./src/documents/wiki", "Home.md");
const QuickStartPath = path.join(process.cwd(), "./src/documents/wiki", "Quick start.md");
const AboutPath = path.join(process.cwd(), "./src/documents/wiki", "About.md");

// Define the path for the markdown file you want to generate
const outputMarkdownPath = path.join(process.cwd(), ".", "README.md");

// Function to read an existing markdown file and generate a new one
async function generateMarkdown() {
    try {
        // Read content from the existing markdown file
        const IntroContent = await fs.readFile(IntroPath, "utf8");
        const QuickStartContent = await fs.readFile(QuickStartPath, "utf8");
        const AboutContent = await fs.readFile(AboutPath, "utf8");

        // Combine the existing content with the new content
        const combinedContent = [
            "# CircuitPython Online IDE 2",
            IntroContent,
            "# Quick Start",
            QuickStartContent,
            "# About",
            AboutContent,
        ]
            .join("\n\n")
            .split("\n#")
            .join("\n##");

        // Write the combined content to a new markdown file
        await fs.writeFile(outputMarkdownPath, combinedContent);

        console.log("Markdown file generated successfully!");
    } catch (err) {
        console.error("Failed to generate markdown file:", err);
    }
}

// Call the function to generate the markdown
generateMarkdown();
