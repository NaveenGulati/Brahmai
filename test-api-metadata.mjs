import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testPexels() {
  console.log('\n=== PEXELS API ===');
  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      params: {
        query: 'steam engine',
        per_page: 1,
      },
      headers: {
        'Authorization': process.env.PEXELS_API_KEY,
      },
    });

    const photo = response.data.photos[0];
    console.log('Available fields:', Object.keys(photo));
    console.log('Full photo object:', JSON.stringify(photo, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testPixabay() {
  console.log('\n=== PIXABAY API ===');
  try {
    const response = await axios.get('https://pixabay.com/api/', {
      params: {
        key: process.env.PIXABAY_API_KEY,
        q: 'steam engine',
        per_page: 1,
      },
    });

    const hit = response.data.hits[0];
    console.log('Available fields:', Object.keys(hit));
    console.log('Full hit object:', JSON.stringify(hit, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testUnsplash() {
  console.log('\n=== UNSPLASH API ===');
  try {
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: 'steam engine',
        per_page: 1,
      },
      headers: {
        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    });

    const photo = response.data.results[0];
    console.log('Available fields:', Object.keys(photo));
    console.log('Full photo object:', JSON.stringify(photo, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function main() {
  await testPexels();
  await testPixabay();
  await testUnsplash();
}

main();
