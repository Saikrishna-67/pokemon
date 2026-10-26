// Pokémon Raid Boss Definitions & Type Matchup Engine
// Co-op and Solo Raid Battles for Drafted 5-Pokemon Squads

const TYPE_CHART = {
    Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
    Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
    Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
    Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
    Electric: { Water: 2, Grass: 0.5, Electric: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
    Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
    Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
    Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
    Ground: { Fire: 2, Grass: 0.5, Electric: 2, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
    Flying: { Grass: 2, Electric: 0.5, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
    Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
    Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
    Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
    Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
    Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
    Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
    Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
    Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
};

function getMoveMultiplier(moveType, targetTypes) {
    if (!moveType || !targetTypes || !targetTypes.length) return 1.0;
    let mult = 1.0;
    for (const defType of targetTypes) {
        if (TYPE_CHART[moveType] && typeof TYPE_CHART[moveType][defType] !== 'undefined') {
            mult *= TYPE_CHART[moveType][defType];
        }
    }
    return mult;
}

const RAID_BOSSES = [
    {
        id: "boss_1",
        name: "Mewtwo",
        title: "Awakened Genetic Sovereign",
        difficulty: "Tier 1 - Standard Raid",
        badge: "Psychic Mind Badge",
        image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png",
        types: ["Psychic"],
        maxHp: 180000,
        currentHp: 180000,
        attackPower: 450,
        defense: 250,
        phases: [
            { threshold: 1.0, name: "Phase 1: Telekinetic Barrier", buff: "Takes 20% reduced damage" },
            { threshold: 0.5, name: "Phase 2: Berserk Psystrike Awakening", buff: "Attack power increased by 40%!" }
        ],
        bossMoves: [
            { name: "Psystrike Nova", type: "Psychic", power: 140, aoe: false, desc: "Fires concentrated psychic wave at lead Pokémon" },
            { name: "Shadow Ball Cataclysm", type: "Ghost", power: 120, aoe: true, desc: "Unleashes shadowy orbs blasting all squad members" },
            { name: "Aura Sphere Barrage", type: "Fighting", power: 110, aoe: false, desc: "Aura wave that never misses its target" },
            { name: "Psychic Mind Crush", type: "Psychic", power: 160, aoe: true, desc: "Crushes the entire battlefield with overwhelming willpower" }
        ],
        lore: "Created in a secret laboratory through horrific gene splicing, Mewtwo tests trainers with its terrifying intelligence."
    },
    {
        id: "boss_2",
        name: "Primal Groudon & Primal Kyogre",
        title: "Cataclysm of Land and Sea",
        difficulty: "Tier 2 - Titan Raid",
        badge: "Continental Oceanic Badge",
        image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10078.png",
        types: ["Ground", "Fire"],
        maxHp: 350000,
        currentHp: 350000,
        attackPower: 600,
        defense: 350,
        phases: [
            { threshold: 1.0, name: "Phase 1: Desolate Land Heatwave", buff: "Fire attacks deal 50% extra damage" },
            { threshold: 0.5, name: "Phase 2: Primordial Deluge Shift", buff: "Switches type to Water and floods the arena!" }
        ],
        bossMoves: [
            { name: "Precipice Blades", type: "Ground", power: 150, aoe: true, desc: "Summons giant earthen stone blades beneath entire team" },
            { name: "Origin Pulse Deluge", type: "Water", power: 150, aoe: true, desc: "Beams of torrential primordial water" },
            { name: "Fire Blast Supernova", type: "Fire", power: 130, aoe: false, desc: "Scorches single Pokémon with burning magma" },
            { name: "Continental Tremor", type: "Ground", power: 170, aoe: true, desc: "Cataclysmic earthquake splitting the raid arena" }
        ],
        lore: "The ancient titans whose primordial clash created the continents and oceans now threaten to reshape the world."
    },
    {
        id: "boss_3",
        name: "Mega Rayquaza",
        title: "Sky High Dragon Sovereign",
        difficulty: "Tier 3 - Mythic Raid",
        badge: "Ozone Skycrest Badge",
        image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10079.png",
        types: ["Dragon", "Flying"],
        maxHp: 550000,
        currentHp: 550000,
        attackPower: 800,
        defense: 320,
        phases: [
            { threshold: 1.0, name: "Phase 1: Delta Stream Atmosphere", buff: "Flying weaknesses are completely neutralized" },
            { threshold: 0.4, name: "Phase 2: Meteor Dragon Ascent", buff: "Attack power rises by 60%, speed doubles!" }
        ],
        bossMoves: [
            { name: "Dragon Ascent", type: "Flying", power: 175, aoe: false, desc: "Swoops from the stratosphere at Mach 5 into target" },
            { name: "Extreme Speed Blitz", type: "Normal", power: 120, aoe: true, desc: "Hits every team member with supersonic speed" },
            { name: "Draco Meteor Tempest", type: "Dragon", power: 160, aoe: true, desc: "Calls comets down from low-orbit space" },
            { name: "V-Create Incineration", type: "Fire", power: 190, aoe: false, desc: "Headlong flaming collision with tremendous force" }
        ],
        lore: "The guardian of the ozone layer. Consuming meteors for millennia, its mega evolution controls the heavens."
    },
    {
        id: "boss_4",
        name: "Ultra Necrozma",
        title: "Light That Devoured The Sky",
        difficulty: "Tier 4 - Calamity Raid",
        badge: "Cosmic Radiance Badge",
        image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10157.png",
        types: ["Psychic", "Dragon"],
        maxHp: 800000,
        currentHp: 800000,
        attackPower: 1050,
        defense: 380,
        phases: [
            { threshold: 1.0, name: "Phase 1: Neuroforce Radiance", buff: "All super-effective moves against you deal +30% damage" },
            { threshold: 0.3, name: "Phase 2: Supernova Apocalypse", buff: "Prepares light that burns the sky!" }
        ],
        bossMoves: [
            { name: "Light That Burns The Sky", type: "Psychic", power: 210, aoe: true, desc: "Devastating universal supernova striking entire squad" },
            { name: "Photon Geyser", type: "Psychic", power: 140, aoe: false, desc: "Pillar of radiant light piercing defensive stat boosts" },
            { name: "Dragon Pulse Vortex", type: "Dragon", power: 130, aoe: true, desc: "Spiraling dragon beam sweeping across the field" },
            { name: "Prismatic Laser Strike", type: "Psychic", power: 170, aoe: false, desc: "Hyper-concentrated laser cutting target in two" }
        ],
        lore: "A cosmic dragon composed of pure brilliant light that once illuminated an entire separate dimension."
    },
    {
        id: "boss_5",
        name: "Arceus",
        title: "The Original One (Omnipotent Creator)",
        difficulty: "Tier 5 - Godhood Raid (Supreme)",
        badge: "Alpha Creation Crown",
        image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/493.png",
        types: ["Normal"],
        maxHp: 1200000,
        currentHp: 1200000,
        attackPower: 1300,
        defense: 450,
        phases: [
            { threshold: 1.0, name: "Phase 1: Creation of Spacetime", buff: "Roar of Time & Spacial Rend active" },
            { threshold: 0.6, name: "Phase 2: Thousand Arms Awakened", buff: "Changes plate type to resist your strongest attacker!" },
            { threshold: 0.25, name: "Phase 3: Universal Genesis", buff: "Judgment AoE power doubled!" }
        ],
        bossMoves: [
            { name: "Judgment (Divine Light)", type: "Normal", power: 180, aoe: true, desc: "Shoots meteoric cosmic judgment light beams at all foes" },
            { name: "Roar of Time", type: "Dragon", power: 160, aoe: false, desc: "Distorts time around target to paralyze and crush" },
            { name: "Spacial Rend", type: "Dragon", power: 150, aoe: false, desc: "Tears space itself around opponent" },
            { name: "Cosmic Genesis Extinction", type: "Psychic", power: 230, aoe: true, desc: "Recreates the birth of the cosmos in a catastrophic shockwave" }
        ],
        lore: "The supreme architect of the Pokémon universe. It emerged from an egg in a realm of pure nothingness."
    }
];
