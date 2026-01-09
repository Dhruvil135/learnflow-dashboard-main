// backend/check-models.js
require('dotenv').config(); // Load your .env file

async function checkModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("❌ No API Key found in .env! Please check your file.");
    return;
  }

  console.log("Checking models for key ending in...", apiKey.slice(-4));
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Error from Google:", data.error.message);
    } else {
      console.log("\n✅ SUCCESS! Here are the models you can use:");
      console.log("---------------------------------------------");
      // Filter for only 'generateContent' models to make it readable
      const available = data.models
        .filter(m => m.supportedGenerationMethods.includes("generateContent"))
        .map(m => m.name.replace("models/", ""));
      
      console.log(available.join("\n"));
      console.log("---------------------------------------------");
      console.log("👉 Pick one of these names and put it in your aiController.js!");
    }
  } catch (error) {
    console.error("Network Error:", error.message);
  }
}

checkModels();