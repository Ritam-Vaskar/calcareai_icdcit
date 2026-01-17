const aiConversationService = require('./services/aiConversationService');

console.log('\n=== AI Services Configuration Check ===\n');

// Check Deepgram
if (process.env.DEEPGRAM_API_KEY) {
    console.log('✅ Deepgram API Key: Configured');
} else {
    console.log('❌ Deepgram API Key: NOT configured');
    console.log('   Get free key from: https://console.deepgram.com');
}

// Check Azure Speech
if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
    console.log('✅ Azure Speech: Configured');
} else {
    console.log('❌ Azure Speech: NOT configured');
    console.log('   Get free key from: https://portal.azure.com');
}

// Check GitHub Models
if (process.env.GITHUB_TOKEN) {
    console.log('✅ GitHub Models: Configured');
} else {
    console.log('❌ GitHub Models: NOT configured');
}

// Check if full AI conversation is available
const isFullyConfigured = aiConversationService.isConfigured();
console.log('\n=== AI Conversation Status ===');
if (isFullyConfigured) {
    console.log('✅ Advanced AI Conversation: ENABLED');
    console.log('   Calls will use real-time AI with Deepgram + GitHub Models + Polly');
} else {
    console.log('⚠️  Advanced AI Conversation: DISABLED');
    console.log('   Calls will use Simple TwiML (pre-recorded messages)');
    console.log('   Add Deepgram + GitHub Token to enable advanced AI');
}

console.log('\n=== Twilio Configuration ===');
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    console.log('✅ Twilio: Configured');
    console.log('   Phone Number:', process.env.TWILIO_PHONE_NUMBER);
} else {
    console.log('❌ Twilio: NOT configured');
}

console.log('\n=======================================\n');
