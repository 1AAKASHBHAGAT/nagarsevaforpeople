// ⚠️ IMPORTANT: Set your Gemini API key in .env as VITE_GEMINI_API_KEY
const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY ||
  "AIzaSyDemoGeminiKeyReplace123456789";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * Analyze a complaint image using Gemini AI
 * @param {File} imageFile - The image file to analyze
 * @returns {Promise<Object>} - Analysis result with category, severity, confidence, description
 */
export const analyzeComplaintImage = async (imageFile) => {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("DemoGeminiKeyReplace")) {
      return {
        success: false,
        error: "Gemini API key missing or placeholder.",
        category: "Other",
        severity: "Medium",
        confidence: 0,
        description: "Unable to analyze image. Please categorize manually.",
      };
    }

    // Convert file to base64
    const base64Image = await fileToBase64(imageFile);
    const imageData = base64Image.split(",")[1]; // Remove data:image/... prefix

    const prompt = `You are a municipal complaint classifier. Analyze this image and return a JSON object with:
    - category (one of: Road Damage, Water Supply, Electricity, Drainage, Garbage, Other)
    - severity (Low/Medium/High)
    - confidence (0-100 as number)
    - description (one-sentence description of the issue in simple English)
    
    Return ONLY valid JSON, no markdown or extra text.
    Example: {"category":"Road Damage","severity":"High","confidence":95,"description":"Large pothole on main street affecting traffic"}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageData,
              },
            },
          ],
        },
      ],
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No response from Gemini API");
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON in response");
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return {
      success: true,
      category: analysis.category || "Other",
      severity: analysis.severity || "Medium",
      confidence: analysis.confidence || 50,
      description: analysis.description || "Civic issue detected",
    };
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return {
      success: false,
      error: error.message,
      category: "Other",
      severity: "Medium",
      confidence: 0,
      description: "Unable to analyze image. Please categorize manually.",
    };
  }
};

/**
 * Generate AI recommendations based on complaint statistics
 * @param {Object} stats - Complaint statistics
 * @returns {Promise<String>} - AI-generated recommendations
 */
export const generateAIRecommendations = async (stats) => {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("DemoGeminiKeyReplace")) {
      return "• Focus on the most common complaint types first\n• Allocate more resources to high-severity issues";
    }

    const prompt = `You are a municipal management advisor. Based on these complaint statistics:
    - Total Complaints: ${stats.totalComplaints}
    - Most Common Category: ${stats.topCategory}
    - Average Resolution Time: ${stats.avgResolutionTime} hours
    - Pending Complaints: ${stats.pendingCount}
    
    Give 2 bullet point recommendations for the municipal authority to improve resolution speed and citizen satisfaction. Be concise and actionable.`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const recommendations =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Unable to generate recommendations";
    return recommendations;
  } catch (error) {
    console.error("Recommendation Generation Error:", error);
    return "• Focus on the most common complaint types first\n• Allocate more resources to high-severity issues";
  }
};

/**
 * Convert File to Base64
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
};
