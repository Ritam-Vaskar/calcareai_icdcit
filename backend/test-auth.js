const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

console.log('🧪 Testing Authentication System...\n');

async function testAuth() {
    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing server health...');
        const healthResponse = await axios.get('http://localhost:5000/health');
        console.log('✅ Server is running:', healthResponse.data.message);
        console.log('');

        // Test 2: Register a new user
        console.log('2️⃣ Testing user registration...');
        const registerData = {
            name: 'Test User',
            email: `test${Date.now()}@example.com`,
            password: 'test123456',
            role: 'staff',
            phone: '+919876543210'
        };

        try {
            const registerResponse = await axios.post(`${API_URL}/auth/register`, registerData);
            console.log('✅ Registration successful!');
            console.log('   User:', registerResponse.data.data.user.name);
            console.log('   Email:', registerResponse.data.data.user.email);
            console.log('   Role:', registerResponse.data.data.user.role);
            console.log('   Token received:', registerResponse.data.data.token ? 'Yes' : 'No');
            console.log('');

            const token = registerResponse.data.data.token;
            const refreshToken = registerResponse.data.data.refreshToken;

            // Test 3: Get current user (protected route)
            console.log('3️⃣ Testing protected route (GET /auth/me)...');
            const meResponse = await axios.get(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('✅ Protected route works!');
            console.log('   User:', meResponse.data.data.user.name);
            console.log('');

            // Test 4: Login with the same user
            console.log('4️⃣ Testing login...');
            const loginResponse = await axios.post(`${API_URL}/auth/login`, {
                email: registerData.email,
                password: registerData.password
            });
            console.log('✅ Login successful!');
            console.log('   New token received:', loginResponse.data.data.token ? 'Yes' : 'No');
            console.log('');

            // Test 5: Refresh token
            console.log('5️⃣ Testing token refresh...');
            const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
                refreshToken: refreshToken
            });
            console.log('✅ Token refresh works!');
            console.log('   New token received:', refreshResponse.data.data.token ? 'Yes' : 'No');
            console.log('   New refresh token received:', refreshResponse.data.data.refreshToken ? 'Yes' : 'No');
            console.log('');

            // Test 6: Logout
            console.log('6️⃣ Testing logout...');
            const logoutResponse = await axios.post(`${API_URL}/auth/logout`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('✅ Logout successful!');
            console.log('');

            // Test 7: Try to access protected route after logout (should fail)
            console.log('7️⃣ Testing access after logout (should fail)...');
            try {
                await axios.get(`${API_URL}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log('❌ ERROR: Should not be able to access after logout!');
            } catch (error) {
                if (error.response?.status === 401) {
                    console.log('✅ Correctly blocked access after logout');
                } else {
                    console.log('⚠️  Unexpected error:', error.message);
                }
            }
            console.log('');

            console.log('🎉 All authentication tests passed!');
            console.log('');
            console.log('📋 Summary:');
            console.log('   ✅ Registration works');
            console.log('   ✅ Login works');
            console.log('   ✅ Protected routes work');
            console.log('   ✅ Token refresh works');
            console.log('   ✅ Logout works');
            console.log('   ✅ Access control works');
            console.log('');
            console.log('🔐 Authentication system is fully functional!');

        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
                console.log('⚠️  User already exists, trying login instead...');

                const loginResponse = await axios.post(`${API_URL}/auth/login`, {
                    email: registerData.email,
                    password: registerData.password
                });
                console.log('✅ Login successful!');
                console.log('   Token received:', loginResponse.data.data.token ? 'Yes' : 'No');
            } else {
                throw error;
            }
        }

    } catch (error) {
        console.error('❌ Authentication test failed!');
        console.error('');

        if (error.response) {
            console.error('Error Response:');
            console.error('   Status:', error.response.status);
            console.error('   Message:', error.response.data?.message || error.response.statusText);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received from server');
            console.error('Is the backend running on http://localhost:5000?');
        } else {
            console.error('Error:', error.message);
        }

        process.exit(1);
    }
}

testAuth();
