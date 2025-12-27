// Asset imports
import asgardImg from '../assets/locations/asgard.jpg';
import atlantisImg from '../assets/locations/atlantis.jpg';
import attilanImg from '../assets/locations/attilan.jpg';
import avengersTowerImg from '../assets/locations/avengers tower nyc.jpg';
import hellsKitchenImg from '../assets/locations/hells kitchen.jpg';
import knowhereImg from '../assets/locations/knowhere.jpg';
import triskelionImg from '../assets/locations/triskelion.jpg';
import wakandaImg from '../assets/locations/wakanda.jpg';

// Define the 4 tiles, each with Side A and Side B
export const LOCATION_TILES = [
    {
        id: 'tile1',
        sideA: {
            id: 'avengers_tower',
            name: 'Avengers Tower, NYC',
            points: 3,
            requirements: { yellow: 4, blue: 4 },
            image: avengersTowerImg
        },
        sideB: {
            id: 'attilan',
            name: 'Attilan',
            points: 3,
            requirements: { red: 4, purple: 4 },
            image: attilanImg
        }
    },
    {
        id: 'tile2',
        sideA: {
            id: 'hells_kitchen',
            name: "Hell's Kitchen, NYC",
            points: 3,
            requirements: { yellow: 4, orange: 4 },
            image: hellsKitchenImg
        },
        sideB: {
            id: 'triskelion',
            name: 'Triskelion',
            points: 3,
            requirements: { orange: 4, purple: 4 },
            image: triskelionImg
        }
    },
    {
        id: 'tile3',
        sideA: {
            id: 'asgard',
            name: 'Asgard',
            points: 3,
            requirements: { yellow: 3, orange: 3, purple: 3 },
            image: asgardImg
        },
        sideB: {
            id: 'wakanda',
            name: 'Wakanda',
            points: 3,
            requirements: { blue: 4, red: 4 },
            image: wakandaImg
        }
    },
    {
        id: 'tile4',
        sideA: {
            id: 'atlantis',
            name: 'Atlantis',
            points: 3,
            requirements: { blue: 3, red: 3, purple: 3 },
            image: atlantisImg
        },
        sideB: {
            id: 'knowhere',
            name: 'Knowhere',
            points: 3,
            requirements: { yellow: 3, blue: 3, red: 3 },
            image: knowhereImg
        }
    }
];
