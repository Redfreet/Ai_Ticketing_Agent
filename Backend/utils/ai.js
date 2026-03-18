import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analyzeTicket = async (ticket) => {
  console.log(`Sending ticket to Gemini: "${ticket.title}"`);

  try {
    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        summary: {
          type: SchemaType.STRING,
          description: "A short 1-2 sentence summary of the issue.",
        },
        priority: {
          type: SchemaType.STRING,
          description: "Must be exactly 'low', 'medium', or 'high'.",
        },
        helpfulNotes: {
          type: SchemaType.STRING,
          description:
            "A detailed technical explanation that a moderator can use to solve this issue. Include useful external links or resources if possible.",
        },
        relatedSkills: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description:
            "An array of relevant skills required to solve the issue (e.g., ['React', 'MongoDB']).",
        },
      },
      required: ["summary", "priority", "helpfulNotes", "relatedSkills"],
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const prompt = `Analyze the following support ticket and extract the required triage data:
    Title: ${ticket.title}
    Description: ${ticket.description}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return JSON.parse(responseText);
  } catch (error) {
    console.error(
      "[AI Worker] Failed to fetch or parse AI response:",
      error.message,
    );
    return null;
  }
};

export default analyzeTicket;
