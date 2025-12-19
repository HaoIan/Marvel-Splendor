
import fs from 'fs';
import path from 'path';

const cardsPath = path.join(process.cwd(), 'src', 'data', 'cards.ts');
const charsPath = path.join(process.cwd(), 'marvel_chars.json');

const cardsContent = fs.readFileSync(cardsPath, 'utf-8');
const charsContent = JSON.parse(fs.readFileSync(charsPath, 'utf-8'));

// Update createCard signature
let newContent = cardsContent.replace(
    /const createCard = \(\s*id: string,\s*tier: 1 \| 2 \| 3,\s*points: number,\s*bonus: GemColor,\s*costArr: \[number, number, number, number, number\] \/\/ \[White\/Yellow, Blue, Green\/Orange, Red, Black\/Purple\]\s*\): Card => \{/,
    `const createCard = (
    id: string,
    tier: 1 | 2 | 3,
    points: number,
    bonus: GemColor,
    costArr: [number, number, number, number, number], // [White/Yellow, Blue, Green/Orange, Red, Black/Purple]
    name: string,
    imageUrl: string
): Card => {`
);

// Update createCard return object
newContent = newContent.replace(
    /return \{\s*id,\s*tier,\s*points,\s*bonus,\s*cost,\s*avengersTag: Math.random\(\) > 0.7, \/\/ Randomly assign tags for now\s*\};/,
    `return {
        id,
        tier,
        points,
        bonus,
        cost,
        avengersTag: Math.random() > 0.7,
        name,
        imageUrl
    };`
);

// Update createCard calls
let charIndex = 0;
newContent = newContent.replace(
    /createCard\('(\d+_\d+)', (\d), (\d), '(\w+)', \[([\d, ]+)\]\)(, \/\/.*)?/g,
    (match, id, tier, points, bonus, costArr, comment) => {
        if (charIndex >= charsContent.length) {
            return match; // Should not happen if we have enough chars
        }
        const char = charsContent[charIndex++];
        const commentStr = comment ? comment : '';
        return `createCard('${id}', ${tier}, ${points}, '${bonus}', [${costArr}], "${char.name}", "${char.image}")${commentStr}`;
    }
);

fs.writeFileSync(cardsPath, newContent);
console.log('Successfully updated cards.ts');
