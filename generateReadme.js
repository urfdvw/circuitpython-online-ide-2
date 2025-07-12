// Import the necessary modules
import { promises as fs } from "fs";
import path from "path";

// Define the path for the markdown file you want to read
const HomePath = path.join(process.cwd(), "./src/docs", "Home.md");
const AboutPath = path.join(process.cwd(), "./src/docs", "About.md");
const QuickStartPath = path.join(process.cwd(), "./src/docs", "Quick Start.md");

// Define the path for the markdown file you want to generate
const outputMarkdownPath = path.join(process.cwd(), ".", "README.md");

// Function to read an existing markdown file and generate a new one
async function generateMarkdown() {
    try {
        // Read content from the existing markdown file
        const title = "# CircuitPython Online IDE 2";
        const quickStartTitle = "# Quick Start";
        const video =
            "[![Quick introduction to CircuitPython Online IDE](https://img.youtube.com/vi/kq554m21G4A/0.jpg)](https://www.youtube.com/watch?v=kq554m21G4A)";
        const HomeContent = await fs.readFile(HomePath, "utf8");
        const QuickStartContent = await fs.readFile(QuickStartPath, "utf8");
        const AboutContent = await fs.readFile(AboutPath, "utf8");

        // Combine the existing content with the new content
        const combinedContent = [
            title,
            HomeContent,
            quickStartTitle,
            video,
            QuickStartContent,
            AboutContent.replace("## CircuitPython Online IDE", "## About"),
        ].join("\n\n");

        // Write the combined content to a new markdown file
        await fs.writeFile(outputMarkdownPath, combinedContent);

        console.log("Markdown file generated successfully!");
    } catch (err) {
        console.error("Failed to generate markdown file:", err);
    }
}

// Call the function to generate the markdown
generateMarkdown();
