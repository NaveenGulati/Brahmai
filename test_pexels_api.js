const axios = require('axios');

async function testPexelsAPI() {
  const apiKey = process.env.PEXELS_API_KEY;
  const query = "steam engine energy transformation diagram";
  
  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      params: {
        query,
        per_page: 3,
        orientation: 'landscape',
      },
      headers: {
        'Authorization': apiKey,
      },
    });

    console.log('=== PEXELS API RESPONSE ===');
    console.log(JSON.stringify(response.data.photos[0], null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPexelsAPI();
