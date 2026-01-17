require('dotenv').config();
const { createClient } = require('@deepgram/sdk');
const fs = require('fs');
const path = require('path');

async function testDeepgramTTS() {
    console.log('\n=== Testing Deepgram TTS ===\n');

    if (!process.env.DEEPGRAM_API_KEY) {
        console.log('❌ DEEPGRAM_API_KEY not found in .env file');
        return;
    }

    console.log('✅ DEEPGRAM_API_KEY found');
    console.log('🔄 Testing text-to-speech conversion...\n');

    try {
        const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

        const testText = "Hello! I am CareCall AI. This is a test of the Deepgram text to speech system. How are you feeling today?";

        console.log('📝 Text to convert:', testText);
        console.log('🎤 Generating audio...\n');

        const response = await deepgram.speak.request(
            { text: testText },
            {
                model: 'aura-asteria-en', // Natural female voice
                encoding: 'mulaw',
                sample_rate: 8000,
                container: 'none'
            }
        );

        // Get the audio stream
        const stream = await response.getStream();
        if (!stream) {
            throw new Error('No audio stream returned from Deepgram TTS');
        }

        console.log('✅ Audio stream received');
        console.log('🔄 Converting stream to buffer...\n');

        // Convert stream to buffer
        const chunks = [];
        const reader = stream.getReader();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        const audioBuffer = Buffer.concat(chunks);

        console.log('✅ Audio buffer created');
        console.log('📊 Buffer size:', audioBuffer.length, 'bytes');
        console.log('📊 Format: mulaw, 8000Hz (perfect for Twilio)\n');

        // Save to file for testing
        const outputPath = path.join(__dirname, 'test-deepgram-tts.raw');
        fs.writeFileSync(outputPath, audioBuffer);

        console.log('✅ Audio saved to:', outputPath);
        console.log('\n=== Test Successful! ===');
        console.log('\nDeepgram TTS is working perfectly!');
        console.log('Voice: Aura Asteria (Natural Female)');
        console.log('Format: mulaw @ 8kHz (Twilio compatible)');
        console.log('\nYour AI calls will have clear, natural voice responses! 🎉\n');

    } catch (error) {
        console.log('❌ Error testing Deepgram TTS:', error.message);
        console.log('\nPossible issues:');
        console.log('1. Invalid DEEPGRAM_API_KEY');
        console.log('2. Network connectivity issue');
        console.log('3. Deepgram TTS not enabled on your account');
        console.log('\nFull error:', error);
    }
}

testDeepgramTTS().catch((err) => {
    console.error("Test encountered an error:", err);
});
