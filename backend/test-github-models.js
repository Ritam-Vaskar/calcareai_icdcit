require('dotenv').config();
const ModelClient = require('@azure-rest/ai-inference').default;
const { isUnexpected } = require('@azure-rest/ai-inference');
const { AzureKeyCredential } = require('@azure/core-auth');

const token = process.env.GITHUB_TOKEN;
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4o-mini";

async function testGitHubModels() {
    console.log('\n=== Testing GitHub Models (GPT-4o-mini) ===\n');

    if (!token) {
        console.log('❌ GITHUB_TOKEN not found in .env file');
        console.log('   Please add GITHUB_TOKEN to your .env file');
        return;
    }

    console.log('✅ GITHUB_TOKEN found');
    console.log('🔄 Testing connection to GitHub Models...\n');

    try {
        const client = ModelClient(endpoint, new AzureKeyCredential(token));

        const response = await client.path("/chat/completions").post({
            body: {
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful medical AI assistant for a healthcare clinic."
                    },
                    {
                        role: "user",
                        content: "A patient says they are feeling better after taking their medication. Respond warmly in 1-2 sentences."
                    }
                ],
                model: model,
                temperature: 0.7,
                max_tokens: 100,
                top_p: 0.9
            }
        });

        if (isUnexpected(response)) {
            console.log('❌ GitHub Models Error:', response.body.error);
            return;
        }

        const aiResponse = response.body.choices[0].message.content;
        console.log('✅ GitHub Models (GPT-4o-mini) is working!');
        console.log('📝 AI Response:', aiResponse);
        console.log('\n✅ Model:', model);
        console.log('✅ Endpoint:', endpoint);
        console.log('\n=== Test Successful ===\n');

    } catch (error) {
        console.log('❌ Error testing GitHub Models:', error.message);
        console.log('\nPossible issues:');
        console.log('1. Invalid GITHUB_TOKEN');
        console.log('2. Network connectivity issue');
        console.log('3. GitHub Models API is down');
        console.log('\nFull error:', error);
    }
}

testGitHubModels().catch((err) => {
    console.error("Test encountered an error:", err);
});
