
import fs from 'fs';

const url = 'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/all.json';

try {
    const response = await fetch(url);
    const characters = await response.json();
    const marvelChars = characters.filter(c => c.biography.publisher === 'Marvel Comics');
    const selected = marvelChars.slice(0, 90).map(c => ({
        name: c.name,
        image: c.images.md
    }));
    fs.writeFileSync('marvel_chars.json', JSON.stringify(selected, null, 2));
    console.log('Successfully wrote marvel_chars.json');
} catch (error) {
    console.error('Error:', error);
    process.exit(1);
}
