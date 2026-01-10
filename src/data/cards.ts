import type { Card, GemColor, Cost } from '../types';

// Mapping Standard Splendor -> Marvel Splendor
// White -> Yellow (Mind)
// Blue -> Blue (Space)
// Green -> Orange (Soul)
// Red -> Red (Reality)
// Black -> Purple (Power)

const createCard = (
    id: string,
    tier: 1 | 2 | 3,
    points: number,
    bonus: GemColor,
    costArr: [number, number, number, number, number], // [White/Yellow, Blue, Green/Orange, Red, Black/Purple]
    name: string,
    imageUrl: string,
    avengersPoints: number = 0
): Card => {
    const cost: Cost = {};
    if (costArr[0] > 0) cost.yellow = costArr[0];
    if (costArr[1] > 0) cost.blue = costArr[1];
    if (costArr[2] > 0) cost.orange = costArr[2];
    if (costArr[3] > 0) cost.red = costArr[3];
    if (costArr[4] > 0) cost.purple = costArr[4];

    return {
        id,
        tier,
        points,
        bonus,
        cost,
        avengersTag: avengersPoints,
        name,
        imageUrl
    };
};

export const INITIAL_DECK: Card[] = [
    // White/Yellow, Blue, Green/Orange, Red, Black/Purple

    // --- LEVEL 1 (Total 40) ---
    // 0 Points
    createCard('1_01', 1, 0, 'blue', [1, 0, 0, 0, 2], "A-Bomb", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/1-a-bomb.jpg"),
    createCard('1_02', 1, 0, 'blue', [0, 0, 0, 0, 3], "Abomination", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/4-abomination.jpg"),
    createCard('1_03', 1, 0, 'blue', [1, 0, 1, 1, 1], "Abraxas", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/5-abraxas.jpg"),
    createCard('1_04', 1, 0, 'blue', [0, 0, 2, 0, 2], "Black Knight", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/102-black-knight-iii.jpg"),
    createCard('1_05', 1, 1, 'blue', [0, 0, 0, 4, 0], "Agent Bob", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/10-agent-bob.jpg"),
    createCard('1_06', 1, 0, 'blue', [1, 0, 1, 2, 1], "Agent Zero", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/11-agent-zero.jpg"),
    createCard('1_07', 1, 0, 'blue', [1, 0, 2, 2, 0], "Wasp", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/708-wasp.jpg", 1),
    createCard('1_08', 1, 0, 'blue', [0, 1, 3, 1, 0], "Valkyrie", "src/assets/card-art/Valkyrie.jpg", 1),

    createCard('1_09', 1, 0, 'red', [0, 2, 1, 0, 0], "Angel Dust", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/25-angel-dust.jpg"),
    createCard('1_10', 1, 0, 'red', [3, 0, 0, 0, 0], "Annihilus", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/29-annihilus.jpg"),
    createCard('1_11', 1, 0, 'red', [1, 1, 1, 0, 1], "Ant-Man", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/31-ant-man-ii.jpg"),
    createCard('1_12', 1, 0, 'red', [2, 0, 0, 2, 0], "Apocalypse", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/35-apocalypse.jpg"),
    createCard('1_13', 1, 1, 'red', [4, 0, 0, 0, 0], "Mysterio", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/479-mysterio.jpg"),
    createCard('1_14', 1, 0, 'red', [2, 1, 1, 0, 1], "Arclight", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/41-arclight.jpg"),
    createCard('1_15', 1, 0, 'red', [2, 0, 1, 0, 2], "Ms Marvel", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/477-ms-marvel-ii.jpg", 1),
    createCard('1_16', 1, 0, 'red', [1, 0, 0, 1, 3], "Quake", "src/assets/card-art/Quake.webp", 1),

    createCard('1_17', 1, 0, 'orange', [2, 1, 0, 0, 0], "Ariel", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/44-ariel.jpg"),
    createCard('1_18', 1, 0, 'orange', [0, 0, 0, 3, 0], "Armor", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/45-armor.jpg"),
    createCard('1_19', 1, 0, 'orange', [1, 1, 0, 1, 1], "Ardina", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/42-ardina.jpg"),
    createCard('1_20', 1, 0, 'orange', [0, 2, 0, 2, 0], "Azazel", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/57-azazel.jpg"),
    createCard('1_21', 1, 1, 'orange', [0, 0, 0, 0, 4], "Banshee", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/61-banshee.jpg"),
    createCard('1_22', 1, 0, 'orange', [1, 1, 0, 1, 2], "Bantam", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/62-bantam.jpg"),
    createCard('1_23', 1, 0, 'orange', [0, 1, 0, 2, 2], "Hawkeye", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/313-hawkeye.jpg", 1),
    createCard('1_24', 1, 0, 'orange', [1, 3, 1, 0, 0], "Kate Bishop", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/314-hawkeye-ii.jpg", 1),

    createCard('1_25', 1, 0, 'yellow', [0, 3, 0, 0, 0], "Beta Ray Bill", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/79-beta-ray-bill.jpg"),
    createCard('1_26', 1, 0, 'yellow', [0, 0, 0, 2, 1], "Elektra", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/238-elektra.jpg"),
    createCard('1_27', 1, 0, 'yellow', [0, 1, 1, 1, 1], "Beast", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/75-beast.jpg"),
    createCard('1_28', 1, 0, 'yellow', [0, 2, 0, 0, 2], "Bird-Brain", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/88-bird-brain.jpg"),
    createCard('1_29', 1, 1, 'yellow', [0, 0, 4, 0, 0], "Bishop", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/92-bishop.jpg"),
    createCard('1_30', 1, 0, 'yellow', [0, 1, 2, 1, 1], "Black Bolt", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/96-black-bolt.jpg"),
    createCard('1_31', 1, 0, 'yellow', [0, 2, 2, 0, 1], "Squirrel Girl", "https://upload.wikimedia.org/wikipedia/en/e/e2/Unbeatable_Squirrel_Girl.jpg", 1),
    createCard('1_32', 1, 0, 'yellow', [3, 1, 0, 0, 1], "Spider-Woman", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/39-arachne.jpg", 1),

    createCard('1_33', 1, 0, 'purple', [0, 0, 2, 1, 0], "Black Mamba", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/104-black-mamba.jpg"),
    createCard('1_34', 1, 0, 'purple', [0, 0, 3, 0, 0], "Electro", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/237-electro.jpg"),
    createCard('1_35', 1, 0, 'purple', [1, 1, 1, 1, 0], "Air-Walker", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/12-air-walker.jpg"),
    createCard('1_36', 1, 0, 'purple', [2, 0, 2, 0, 0], "Blackout", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/109-blackout.jpg"),
    createCard('1_37', 1, 1, 'purple', [0, 4, 0, 0, 0], "Blackwing", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/110-blackwing.jpg"),
    createCard('1_38', 1, 0, 'purple', [1, 2, 1, 1, 0], "Blackwulf", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/111-blackwulf.jpg"),
    createCard('1_39', 1, 0, 'purple', [2, 2, 0, 1, 0], "Winter Soldier", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/714-winter-soldier.jpg", 1),
    createCard('1_40', 1, 0, 'purple', [0, 0, 1, 3, 1], "America Chavez", "src/assets/card-art/Chavez.webp", 1),

    // --- LEVEL 2 (Total 30) ---
    createCard('2_01', 2, 2, 'blue', [0, 0, 5, 0, 0], "Blink", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/115-blink.jpg"),
    createCard('2_02', 2, 3, 'blue', [0, 0, 6, 0, 0], "Blizzard II", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/118-blizzard-ii.jpg"),
    createCard('2_03', 2, 1, 'blue', [2, 3, 0, 0, 2], "War Machine", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/703-war-machine.jpg", 1),
    createCard('2_04', 2, 1, 'blue', [3, 0, 2, 3, 0], "Quicksilver", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/536-quicksilver.jpg", 1),
    createCard('2_05', 2, 2, 'blue', [4, 2, 0, 0, 1], "Bloodhawk", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/121-bloodhawk.jpg"),
    createCard('2_06', 2, 2, 'blue', [0, 5, 3, 0, 0], "Bullseye", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/141-bullseye.jpg"),

    createCard('2_07', 2, 2, 'red', [0, 0, 0, 0, 5], "Cable", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/145-cable.jpg"),
    createCard('2_08', 2, 3, 'red', [0, 0, 0, 6, 0], "Callisto", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/146-callisto.jpg"),
    createCard('2_09', 2, 1, 'red', [2, 0, 0, 2, 3], "Scarlet Witch", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/579-scarlet-witch.jpg", 1),
    createCard('2_10', 2, 2, 'red', [1, 4, 2, 0, 0], "Captain Britain", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/151-captain-britain.jpg"),
    createCard('2_11', 2, 1, 'red', [0, 3, 0, 2, 3], "Spider-Man", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/620-spider-man.jpg", 1),
    createCard('2_12', 2, 2, 'red', [3, 0, 0, 0, 5], "Captain Planet", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/160-captain-planet.jpg"),

    createCard('2_13', 2, 2, 'orange', [0, 0, 5, 0, 0], "Carnage", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/162-carnage.jpg"),
    createCard('2_14', 2, 3, 'orange', [0, 0, 6, 0, 0], "Century", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/167-century.jpg"),
    createCard('2_15', 2, 1, 'orange', [2, 3, 0, 0, 2], "Nick Fury", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/489-nick-fury.jpg", 1),
    createCard('2_16', 2, 1, 'orange', [3, 0, 2, 3, 0], "Falcon", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/251-falcon.jpg", 1),
    createCard('2_17', 2, 2, 'orange', [4, 2, 0, 0, 1], "Cloak", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/180-cloak.jpg"),
    createCard('2_18', 2, 2, 'orange', [0, 5, 3, 0, 0], "Colossus", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/185-colossus.jpg"),

    createCard('2_19', 2, 2, 'yellow', [0, 0, 0, 5, 0], "Copycat", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/186-copycat.jpg"),
    createCard('2_20', 2, 3, 'yellow', [6, 0, 0, 0, 0], "Cottonmouth", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/188-cottonmouth.jpg"),
    createCard('2_21', 2, 1, 'yellow', [0, 0, 3, 2, 2], "Maria Hill", "src/assets/card-art/mariahill.png", 1),
    createCard('2_22', 2, 2, 'yellow', [0, 0, 1, 4, 2], "Cyclops", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/196-cyclops.jpg"),
    createCard('2_23', 2, 1, 'yellow', [2, 3, 0, 3, 0], "Shuri", "src/assets/card-art/shuri.webp", 1),
    createCard('2_24', 2, 2, 'yellow', [0, 0, 0, 5, 3], "Daredevil", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/201-daredevil.jpg"),

    createCard('2_25', 2, 2, 'purple', [0, 0, 0, 0, 5], "Darkhawk", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/202-darkhawk.jpg"),
    createCard('2_26', 2, 3, 'purple', [0, 0, 0, 6, 0], "Darkstar", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/206-darkstar.jpg"),
    createCard('2_27', 2, 1, 'purple', [2, 0, 0, 2, 3], "She-Hulk", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/589-she-hulk.jpg", 1),
    createCard('2_28', 2, 2, 'purple', [1, 4, 2, 0, 0], "Deathlok", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/215-deathlok.jpg"),
    createCard('2_29', 2, 1, 'purple', [0, 3, 0, 2, 3], "Okoye", "src/assets/card-art/okoye.png", 1),
    createCard('2_30', 2, 2, 'purple', [3, 0, 0, 0, 5], "Destroyer", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/218-destroyer.jpg"),

    // --- LEVEL 3 (Total 20) ---
    createCard('3_01', 3, 4, 'blue', [7, 0, 0, 0, 0], "Doctor Octopus", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/225-doctor-octopus.jpg"),
    createCard('3_02', 3, 5, 'blue', [7, 3, 0, 0, 0], "Doctor Doom", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/222-doctor-doom.jpg"),
    createCard('3_03', 3, 4, 'blue', [6, 3, 0, 0, 3], "Ant-Man", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/31-ant-man-ii.jpg", 1),
    createCard('3_04', 3, 3, 'blue', [3, 0, 3, 3, 5], "Black Widow", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/107-black-widow.jpg", 2),

    createCard('3_05', 3, 4, 'red', [0, 0, 7, 0, 0], "Doctor Strange", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/226-doctor-strange.jpg", 1),
    createCard('3_06', 3, 5, 'red', [0, 0, 7, 3, 0], "Domino", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/227-domino.jpg"),
    createCard('3_07', 3, 4, 'red', [0, 3, 6, 3, 0], "Doppelganger", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/231-doppelganger.jpg"),
    createCard('3_08', 3, 3, 'red', [3, 3, 5, 3, 0], "Thor", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/659-thor.jpg", 2),

    createCard('3_09', 3, 4, 'orange', [0, 7, 0, 0, 0], "Drax the Destroyer", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/234-drax-the-destroyer.jpg"),
    createCard('3_10', 3, 5, 'orange', [0, 7, 3, 0, 0], "Ego", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/235-ego.jpg"),
    createCard('3_11', 3, 4, 'orange', [3, 6, 3, 0, 0], "Black Panther", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/106-black-panther.jpg", 1),
    createCard('3_12', 3, 3, 'orange', [5, 3, 0, 3, 3], "Captain America", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/149-captain-america.jpg", 2),

    createCard('3_13', 3, 4, 'yellow', [0, 0, 0, 0, 7], "Emma Frost", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/241-emma-frost.jpg"),
    createCard('3_14', 3, 5, 'yellow', [3, 0, 0, 0, 7], "Evilhawk", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/248-evilhawk.jpg"),
    createCard('3_15', 3, 4, 'yellow', [3, 0, 0, 3, 6], "Vision", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/697-vision.jpg", 1),
    createCard('3_16', 3, 3, 'yellow', [0, 3, 3, 5, 3], "Iron Man", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/346-iron-man.jpg", 2),

    createCard('3_17', 3, 4, 'purple', [0, 0, 0, 7, 0], "Fallen One II", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/252-fallen-one-ii.jpg"),
    createCard('3_18', 3, 5, 'purple', [0, 0, 0, 7, 3], "Feral", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/254-feral.jpg"),
    createCard('3_19', 3, 4, 'purple', [0, 0, 3, 6, 3], "Captain Marvel", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/157-captain-marvel.jpg", 1),
    createCard('3_20', 3, 3, 'purple', [3, 3, 5, 3, 0], "Hulk", "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/332-hulk.jpg", 2),
];
